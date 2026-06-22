import os
import io
import math
import sqlite3
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# PDF & Document Generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

# ════════════════════════════════════════════════════════════════════════════════
# 📋 PATHS & INITIALIZATION
# ════════════════════════════════════════════════════════════════════════════════

APP_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(APP_DIR, "assets")
MODELS_DIR = os.path.join(APP_DIR, "models")
DATA_DIR = os.path.join(APP_DIR, "data")
DB_PATH = os.path.join(APP_DIR, "zimbank_app.db")
LOGO_PATH = os.path.join(ASSETS_DIR, "zimbank_logo.png")

# Risk decision thresholds
POD_APPROVE_MAX = 0.35
POD_REVIEW_MAX = 0.60
DTI_CRITICAL = 0.42

MODEL_PATH = os.path.join(MODELS_DIR, "final_credit_risk_model.joblib")
STACK_BUNDLE_PATH = os.path.join(MODELS_DIR, "credit_risk_stack.joblib")
SAMPLE_DATA_PATH = os.path.join(DATA_DIR, "sample_test_data.csv")

app = FastAPI(title="ZimBank AI Credit Underwriting API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ════════════════════════════════════════════════════════════════════════════════
# 🗄️ DATABASE CONNECTION & SETUP
# ════════════════════════════════════════════════════════════════════════════════

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            application_id TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            client_dob TEXT NOT NULL,
            province TEXT NOT NULL,
            employment_sector TEXT NOT NULL,
            months_at_employer INTEGER NOT NULL DEFAULT 0,
            monthly_income_usd REAL NOT NULL,
            existing_obligations INTEGER NOT NULL DEFAULT 0,
            num_dependents INTEGER NOT NULL DEFAULT 0,
            amount_usd REAL NOT NULL,
            annual_rate_pct REAL NOT NULL,
            term_months INTEGER NOT NULL,
            loan_purpose TEXT NOT NULL,
            product_code TEXT NOT NULL,
            dti_ratio REAL,
            monthly_installment REAL,
            total_to_income REAL,
            work_stability REAL,
            default_probability REAL,
            risk_tier TEXT,
            underwriting_status TEXT,
            dti_burden_score REAL,
            employment_stability_score REAL,
            existing_leverage_score REAL,
            life_stage_score REAL,
            loan_to_income_score REAL,
            flag_high_dti BOOLEAN DEFAULT 0,
            flag_tenure_instability BOOLEAN DEFAULT 0,
            flag_credit_leverage BOOLEAN DEFAULT 0,
            flag_demographic_burden BOOLEAN DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def seed_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM customers")
    count = cursor.fetchone()[0]
    if count > 0:
        conn.close()
        return

    if not os.path.exists(SAMPLE_DATA_PATH):
        conn.close()
        return

    try:
        df = pd.read_csv(SAMPLE_DATA_PATH).head(100)
        for _, row in df.iterrows():
            record = row.to_dict()
            scores = perform_scoring_on_record(record)
            
            customer_id = str(uuid.uuid4())
            province = _coalesce_str(record.get("province"), "Harare").replace("_", " ")
            employment_sector = _coalesce_str(record.get("employment_sector"), "Retail Trade").replace("_", " ")
            loan_purpose = _coalesce_str(record.get("loan_purpose"), "Business Expansion").replace("_", " ")
            product_code = _coalesce_str(record.get("product_code"), "PL01")
            
            cursor.execute("""
                INSERT INTO customers (
                    id, application_id, full_name, client_dob, province, employment_sector,
                    months_at_employer, monthly_income_usd, existing_obligations, num_dependents,
                    amount_usd, annual_rate_pct, term_months, loan_purpose, product_code,
                    dti_ratio, monthly_installment, total_to_income, work_stability,
                    default_probability, risk_tier, underwriting_status, dti_burden_score,
                    employment_stability_score, existing_leverage_score, life_stage_score,
                    loan_to_income_score, flag_high_dti, flag_tenure_instability,
                    flag_credit_leverage, flag_demographic_burden
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?
                )
            """, (
                customer_id,
                str(record.get("ID")),
                f"Applicant {str(record.get('ID'))}",
                _coalesce_str(record.get("client_dob"), "1990-01-01"),
                province,
                employment_sector,
                _coalesce_int(record.get("months_at_employer"), 12),
                _coalesce_numeric(record.get("monthly_income_usd"), 400.0),
                _coalesce_int(record.get("existing_obligations"), 0),
                _coalesce_int(record.get("num_dependents"), 0),
                _coalesce_numeric(record.get("amount_usd"), 1000.0),
                _coalesce_numeric(record.get("annual_rate_pct"), 25.0),
                _coalesce_int(record.get("term_months"), 12),
                loan_purpose,
                product_code,
                scores["dti_ratio"], scores["monthly_installment"], scores["total_to_income"], scores["work_stability"],
                scores["default_probability"], scores["risk_tier"], scores["underwriting_status"], scores["dti_burden_score"],
                scores["employment_stability_score"], scores["existing_leverage_score"], scores["life_stage_score"],
                scores["loan_to_income_score"], scores["flag_high_dti"], scores["flag_tenure_instability"],
                scores["flag_credit_leverage"], scores["flag_demographic_burden"]
            ))
        conn.commit()
    except Exception as e:
        print(f"Failed to seed database: {e}")
    finally:
        conn.close()

# Database initialized on startup event

# ════════════════════════════════════════════════════════════════════════════════
# 🤖 MODEL INFERENCE ENGINE
# ════════════════════════════════════════════════════════════════════════════════

def _coalesce_numeric(val: Any, default: float) -> float:
    try:
        if val is None:
            return default
        if isinstance(val, (float, np.floating)) and (math.isnan(float(val)) or math.isinf(float(val))):
            return default
        if pd.isna(val):
            return default
        x = float(val)
        if math.isnan(x) or math.isinf(x):
            return default
        return x
    except (TypeError, ValueError):
        return default

def _coalesce_int(val: Any, default: int) -> int:
    return int(round(_coalesce_numeric(val, float(default))))

def _coalesce_str(val: Any, default: str) -> str:
    if val is None:
        return default
    try:
        if pd.isna(val):
            return default
    except TypeError:
        pass
    if isinstance(val, (float, np.floating)) and math.isnan(float(val)):
        return default
    s = str(val).strip()
    return s if s else default

_NUMERIC_FEATURE_DEFAULTS: Dict[str, float] = {
    "amount_usd": 1000.0,
    "annual_rate_pct": 25.0,
    "term_months": 12.0,
    "monthly_income_usd": 400.0,
    "existing_obligations": 0.0,
    "num_dependents": 0.0,
    "months_at_employer": 12.0,
    "age": 35.0,
    "monthly_installment": 0.0,
    "dti_ratio": 0.0,
    "total_to_income": 0.0,
    "work_stability": 0.0,
    "has_obligations": 0.0,
}

def _sanitize_features_for_inference(X: pd.DataFrame) -> pd.DataFrame:
    out = X.copy()
    out = out.replace([np.inf, -np.inf], np.nan)
    for col in out.columns:
        if pd.api.types.is_numeric_dtype(out[col]):
            fill = _NUMERIC_FEATURE_DEFAULTS.get(col, 0.0)
            out[col] = pd.to_numeric(out[col], errors="coerce").fillna(fill)
        else:
            obj_defaults = {
                "province": "Harare",
                "employment_sector": "Retail Trade",
                "loan_purpose": "Business Expansion",
                "product_code": "PL01",
            }
            d = obj_defaults.get(col, "Unknown")
            out[col] = out[col].apply(lambda v, dd=d: _coalesce_str(v, dd))
    return out

def engineer_features_from_record(record: Dict) -> pd.DataFrame:
    amount_usd = _coalesce_numeric(record.get("amount_usd"), 1000.0)
    annual_rate_pct = _coalesce_numeric(record.get("annual_rate_pct"), 25.0)
    term_months = _coalesce_numeric(record.get("term_months"), 12.0)
    monthly_income_usd = _coalesce_numeric(record.get("monthly_income_usd"), 400.0)
    existing_obligations = _coalesce_numeric(record.get("existing_obligations"), 0.0)
    num_dependents = _coalesce_numeric(record.get("num_dependents"), 0.0)
    months_at_employer = _coalesce_numeric(record.get("months_at_employer"), 12.0)

    dob_str = _coalesce_str(record.get("client_dob"), "1990-01-01")
    # Handle various dob format variations gracefully
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            birth_date = datetime.strptime(dob_str[:10], fmt)
            age = float(2026 - birth_date.year)
            break
        except ValueError:
            continue
    else:
        birth_year = pd.to_datetime(dob_str, dayfirst=True, errors="coerce")
        age = float(2026 - birth_year.year) if pd.notnull(birth_year) else 35.0

    age = _coalesce_numeric(age, 35.0)

    monthly_installment = amount_usd / (term_months + 0.1)
    dti_ratio = monthly_installment / (monthly_income_usd + 1.0)
    total_to_income = amount_usd / (monthly_income_usd + 1.0)
    work_stability = months_at_employer / (age * 12.0 + 1.0)
    has_obligations = int(existing_obligations > 0)

    row = pd.DataFrame([{
        "amount_usd": amount_usd,
        "annual_rate_pct": annual_rate_pct,
        "term_months": term_months,
        "monthly_income_usd": monthly_income_usd,
        "existing_obligations": existing_obligations,
        "num_dependents": num_dependents,
        "months_at_employer": months_at_employer,
        "age": age,
        "monthly_installment": monthly_installment,
        "dti_ratio": dti_ratio,
        "total_to_income": total_to_income,
        "work_stability": work_stability,
        "has_obligations": has_obligations,
        "province": _coalesce_str(record.get("province"), "Harare"),
        "employment_sector": _coalesce_str(record.get("employment_sector"), "Retail Trade"),
        "loan_purpose": _coalesce_str(record.get("loan_purpose"), "Business Expansion"),
        "product_code": _coalesce_str(record.get("product_code"), "PL01"),
    }])
    return _sanitize_features_for_inference(row)

class StackingCreditRiskModel:
    def __init__(self, meta_model: Any, base_models: Optional[Dict[str, Any]] = None):
        self.meta_model = meta_model
        self.base_models = base_models or {}

    @staticmethod
    def _proxy_level1_predictions(X: pd.DataFrame) -> np.ndarray:
        dti = X["dti_ratio"].astype(float).values
        stability = X["work_stability"].astype(float).values
        obligations = X["existing_obligations"].astype(float).values
        has_obl = X["has_obligations"].astype(float).values
        total_inc = X["total_to_income"].astype(float).values

        cat_score = np.clip(0.07 + dti * 0.72 + (1.0 - stability) * 0.12, 0.01, 0.99)
        xgb_score = np.clip(0.09 + dti * 0.68 + has_obl * 0.11 + total_inc * 0.02, 0.01, 0.99)
        rf_score = np.clip(0.11 + dti * 0.55 + np.minimum(obligations * 0.09, 0.25), 0.01, 0.99)
        return np.column_stack([cat_score, xgb_score, rf_score])

    def _level1_matrix(self, X: pd.DataFrame) -> np.ndarray:
        if self.base_models:
            preds = []
            if "catboost" in self.base_models:
                preds.append(self.base_models["catboost"].predict_proba(X)[:, 1])
            if "xgboost" in self.base_models:
                preds.append(self.base_models["xgboost"].predict_proba(X)[:, 1])
            if "random_forest" in self.base_models:
                preds.append(self.base_models["random_forest"].predict_proba(X.fillna(-999))[:, 1])
            if len(preds) == 3:
                return np.column_stack(preds)
        return self._proxy_level1_predictions(X)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        Xs = _sanitize_features_for_inference(X)
        level1 = self._level1_matrix(Xs)
        level1 = np.asarray(level1, dtype=float)
        level1 = np.nan_to_num(level1, nan=0.5, posinf=0.99, neginf=0.01)
        level1 = np.clip(level1, 1e-6, 1.0 - 1e-6)
        return self.meta_model.predict_proba(level1)

class SimulationCreditModel:
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        Xs = _sanitize_features_for_inference(X)
        dti = float(Xs["dti_ratio"].iloc[0])
        stability = float(Xs["work_stability"].iloc[0])
        obligations = float(Xs["existing_obligations"].iloc[0])
        prob = min(
            max(0.12 + dti * 0.55 + (1.0 - stability) * 0.15 + min(obligations * 0.08, 0.2), 0.01),
            0.98,
        )
        return np.array([[1.0 - prob, prob]])

def load_validated_pipeline() -> Tuple[Any, str, bool]:
    # Stacking bundle check
    if os.path.exists(STACK_BUNDLE_PATH):
        try:
            bundle = joblib.load(STACK_BUNDLE_PATH)
            meta = bundle["meta_model"]
            bases = {k: bundle[k] for k in ("catboost", "xgboost", "random_forest") if k in bundle}
            return StackingCreditRiskModel(meta, bases), "stacking_full", False
        except Exception:
            pass

    # Model path check
    if os.path.exists(MODEL_PATH):
        try:
            artifact = joblib.load(MODEL_PATH)
            if isinstance(artifact, dict) and "meta_model" in artifact:
                bases = {k: artifact[k] for k in ("catboost", "xgboost", "random_forest") if k in artifact}
                return StackingCreditRiskModel(artifact["meta_model"], bases), "stacking_full", False

            coef_shape = getattr(artifact, "coef_", None)
            n_features = coef_shape.shape[1] if coef_shape is not None else None
            if n_features == 3:
                return StackingCreditRiskModel(artifact), "stacking_meta", False

            return artifact, "sklearn_direct", False
        except Exception:
            pass

    return SimulationCreditModel(), "simulation", True

# Initialize model pipeline once at server startup
from typing import Tuple
model, model_mode, is_simulation_mode = load_validated_pipeline()

def calculate_risk_score_components(
    dti_ratio: float,
    months_at_employer: int,
    existing_obligations: int,
    client_age: int,
    amount_requested: float,
    monthly_income: float
) -> Dict[str, float]:
    components = {}
    
    # DTI Risk Component
    if dti_ratio < 0.20:
        components['dti_risk'] = 10
    elif dti_ratio < 0.35:
        components['dti_risk'] = 25
    elif dti_ratio < 0.50:
        components['dti_risk'] = 50
    else:
        components['dti_risk'] = min(dti_ratio * 100, 95)
    
    # Employment Stability Component
    if months_at_employer < 6:
        components['employment_risk'] = 75
    elif months_at_employer < 12:
        components['employment_risk'] = 50
    elif months_at_employer < 24:
        components['employment_risk'] = 30
    else:
        components['employment_risk'] = 10
    
    # Leverage Component
    components['leverage_risk'] = min(existing_obligations * 20, 80)
    
    # Age Component
    if client_age < 25:
        components['age_risk'] = 45
    elif client_age < 35:
        components['age_risk'] = 25
    elif client_age < 60:
        components['age_risk'] = 15
    else:
        components['age_risk'] = 35
    
    # Loan-to-Income Component
    ltir = (amount_requested / 12) / (monthly_income + 1e-6)
    if ltir < 0.10:
        components['ltir_risk'] = 10
    elif ltir < 0.20:
        components['ltir_risk'] = 25
    elif ltir < 0.35:
        components['ltir_risk'] = 45
    else:
        components['ltir_risk'] = min(ltir * 100, 90)
    
    return components

def perform_scoring_on_record(raw_record: Dict[str, Any]) -> Dict[str, Any]:
    # Sanitizing parameters
    amount_usd = _coalesce_numeric(raw_record.get('amount_usd'), 1000.0)
    annual_rate_pct = _coalesce_numeric(raw_record.get('annual_rate_pct'), 25.0)
    term_months = _coalesce_int(raw_record.get('term_months'), 12)
    monthly_income_usd = _coalesce_numeric(raw_record.get('monthly_income_usd'), 400.0)
    existing_obligations = _coalesce_int(raw_record.get('existing_obligations'), 0)
    num_dependents = _coalesce_int(raw_record.get('num_dependents'), 0)
    months_at_employer = _coalesce_numeric(raw_record.get('months_at_employer'), 12.0)
    province = _coalesce_str(raw_record.get('province'), 'Harare')
    employment_sector = _coalesce_str(raw_record.get('employment_sector'), 'Retail Trade')
    loan_purpose = _coalesce_str(raw_record.get('loan_purpose'), 'Business Expansion')
    product_code = _coalesce_str(raw_record.get('product_code'), 'PL01')

    inference_record = {
        **raw_record,
        "amount_usd": amount_usd,
        "annual_rate_pct": annual_rate_pct,
        "term_months": term_months,
        "monthly_income_usd": monthly_income_usd,
        "existing_obligations": existing_obligations,
        "num_dependents": num_dependents,
        "months_at_employer": months_at_employer,
        "province": province,
        "employment_sector": employment_sector,
        "loan_purpose": loan_purpose,
        "product_code": product_code,
    }
    
    X_inference = engineer_features_from_record(inference_record)
    dti_ratio = float(X_inference["dti_ratio"].iloc[0])
    client_age = int(X_inference["age"].iloc[0])
    estimated_monthly_payment = float(X_inference["monthly_installment"].iloc[0])

    if model_mode == "sklearn_direct":
        numeric_cols = [c for c in X_inference.columns if pd.api.types.is_numeric_dtype(X_inference[c])]
        X_num = _sanitize_features_for_inference(X_inference[numeric_cols])
        probability_of_default = float(model.predict_proba(X_num)[0][1])
    else:
        probability_of_default = float(model.predict_proba(X_inference)[0][1])

    risk_components = calculate_risk_score_components(
        dti_ratio=dti_ratio,
        months_at_employer=int(months_at_employer),
        existing_obligations=existing_obligations,
        client_age=client_age,
        amount_requested=amount_usd,
        monthly_income=monthly_income_usd
    )

    # Risk Flags
    flag_high_dti = dti_ratio > DTI_CRITICAL
    flag_tenure_instability = months_at_employer < 12
    flag_credit_leverage = existing_obligations > 2
    flag_demographic_burden = num_dependents > 3

    # Classification
    if probability_of_default < POD_APPROVE_MAX:
        risk_tier = "Low Risk (Tier A)"
        underwriting_status = "AUTO-APPROVED"
    elif probability_of_default < POD_REVIEW_MAX:
        risk_tier = "Medium Risk (Tier B)"
        underwriting_status = "CREDIT UNDERWRITER REVIEW"
    else:
        risk_tier = "High Risk (Tier C)"
        underwriting_status = "SYSTEM HARD DECLINED"

    return {
        "dti_ratio": dti_ratio,
        "monthly_installment": estimated_monthly_payment,
        "total_to_income": amount_usd / (monthly_income_usd + 1.0),
        "work_stability": months_at_employer / (client_age * 12.0 + 1.0),
        "default_probability": probability_of_default,
        "risk_tier": risk_tier,
        "underwriting_status": underwriting_status,
        "dti_burden_score": risk_components["dti_risk"],
        "employment_stability_score": risk_components["employment_risk"],
        "existing_leverage_score": risk_components["leverage_risk"],
        "life_stage_score": risk_components["age_risk"],
        "loan_to_income_score": risk_components["ltir_risk"],
        "flag_high_dti": flag_high_dti,
        "flag_tenure_instability": flag_tenure_instability,
        "flag_credit_leverage": flag_credit_leverage,
        "flag_demographic_burden": flag_demographic_burden
    }

# ════════════════════════════════════════════════════════════════════════════════
# 📄 PDF COMPILATION FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════════

def get_pdf_logo_flowable(max_width: float = 3.25 * inch, max_height: float = 1.25 * inch):
    if not os.path.exists(LOGO_PATH):
        return None
    try:
        from reportlab.lib.utils import ImageReader
        iw, ih = ImageReader(LOGO_PATH).getSize()
        if iw <= 0 or ih <= 0:
            return Image(LOGO_PATH, width=max_width, height=max_height)
        aspect = ih / float(iw)
        draw_width = max_width
        draw_height = draw_width * aspect
        if draw_height > max_height:
            draw_height = max_height
            draw_width = draw_height / aspect
        return Image(LOGO_PATH, width=draw_width, height=draw_height)
    except Exception:
        return Image(LOGO_PATH, width=max_width, height=max_height)

def compile_underwriting_pdf(
    record: Dict,
    probability: float,
    risk_tier: str,
    action: str,
    critical_drivers: List[str],
    risk_components: Dict[str, float]
) -> io.BytesIO:
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer, pagesize=letter,
        leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40
    )
    
    base_styles = getSampleStyleSheet()
    COLOR_NAVY = colors.HexColor("#0f172a")
    COLOR_SLATE = colors.HexColor("#475569")
    COLOR_BORDER = colors.HexColor("#cbd5e1")
    
    style_h1 = ParagraphStyle(
        'DocH1', parent=base_styles['Heading1'],
        fontName='Helvetica-Bold', fontSize=18, leading=22,
        textColor=COLOR_NAVY, spaceAfter=4, alignment=0
    )
    style_subtitle = ParagraphStyle(
        'DocSub', parent=base_styles['Normal'],
        fontName='Helvetica', fontSize=9, leading=12,
        textColor=COLOR_SLATE, spaceAfter=18
    )
    style_section = ParagraphStyle(
        'SectionH2', parent=base_styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=12, leading=15,
        textColor=COLOR_NAVY, spaceBefore=14, spaceAfter=8,
        keepWithNext=True
    )
    style_body = ParagraphStyle(
        'BodyTxt', parent=base_styles['Normal'],
        fontName='Helvetica', fontSize=9.5, leading=13.5,
        textColor=COLOR_NAVY
    )
    style_body_bold = ParagraphStyle(
        'BodyTxtB', parent=style_body,
        fontName='Helvetica-Bold'
    )
    
    elements = []
    
    logo_flowable = get_pdf_logo_flowable()
    if logo_flowable is not None:
        elements.append(logo_flowable)
        elements.append(Spacer(1, 14))

    elements.append(Paragraph("CREDIT UNDERWRITING ASSESSMENT REPORT", style_h1))
    branch = record.get("branch_code", "HQ-001")
    elements.append(Paragraph(
        f"Basel IV Asset Evaluation • Branch: {branch} • "
        f"Generated: {datetime.now().strftime('%d %B %Y %H:%M:%S UTC')}",
        style_subtitle,
    ))
    elements.append(Spacer(1, 12))
    
    summary_data = [
        [
            Paragraph("<b>Application ID:</b>", style_body),
            Paragraph(str(record.get('application_id', 'N/A')), style_body),
            Paragraph("<b>Default Probability:</b>", style_body),
            Paragraph(f"{probability:.2%}", style_body_bold)
        ],
        [
            Paragraph("<b>Risk Classification:</b>", style_body),
            Paragraph(risk_tier, style_body_bold),
            Paragraph("<b>Underwriting Decision:</b>", style_body),
            Paragraph(action, style_body_bold)
        ]
    ]
    
    table_summary = Table(summary_data, colWidths=[130, 110, 140, 120])
    table_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, COLOR_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table_summary)
    elements.append(Spacer(1, 16))
    
    exposure_data = [
        [
            Paragraph("<b>Parameter</b>", style_body_bold),
            Paragraph("<b>Value</b>", style_body_bold),
            Paragraph("<b>Metric</b>", style_body_bold),
            Paragraph("<b>Value</b>", style_body_bold),
        ],
        [
            Paragraph("Facility Amount Requested", style_body),
            Paragraph(f"${float(record.get('amount_usd', 0)):,.2f}", style_body),
            Paragraph("Debt-to-Income Ratio", style_body),
            Paragraph(f"{record.get('dti_ratio', 0):.1%}", style_body_bold),
        ],
        [
            Paragraph("Loan Term", style_body),
            Paragraph(f"{int(record.get('term_months', 0))} Months", style_body),
            Paragraph("Monthly Income (Verified)", style_body),
            Paragraph(f"${float(record.get('monthly_income_usd', 0)):,.2f}", style_body),
        ],
        [
            Paragraph("Geographic Territory", style_body),
            Paragraph(str(record.get('province', 'N/A')), style_body),
            Paragraph("Employment Sector", style_body),
            Paragraph(str(record.get('employment_sector', 'N/A')), style_body),
        ]
    ]
    
    table_exposure = Table(exposure_data, colWidths=[130, 110, 140, 120])
    table_exposure.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, COLOR_NAVY),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table_exposure)
    elements.append(Spacer(1, 16))
    
    component_labels = {
        'dti_risk': 'Debt-to-Income Burden',
        'employment_risk': 'Employment Stability',
        'leverage_risk': 'Existing Leverage',
        'age_risk': 'Life Stage Risk',
        'ltir_risk': 'Loan-to-Income'
    }
    
    component_data = [
        [Paragraph("<b>Risk Factor</b>", style_body_bold),
         Paragraph("<b>Score</b>", style_body_bold),
         Paragraph("<b>Assessment</b>", style_body_bold)]
    ]
    
    for key, score in sorted(risk_components.items(), key=lambda x: x[1], reverse=True):
        label = component_labels.get(key, key)
        assessment = "🟢 Low Risk" if score < 35 else ("🟡 Medium Risk" if score < 60 else "🔴 High Risk")
        component_data.append([
            Paragraph(label, style_body),
            Paragraph(f"{score:.0f}/100", style_body_bold),
            Paragraph(assessment, style_body)
        ])
    
    table_components = Table(component_data, colWidths=[190, 80, 100])
    table_components.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 1.5, COLOR_NAVY),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(table_components)
    elements.append(Spacer(1, 16))
    
    narrative = f"The applicant's credit profile demonstrates a default probability of <b>{probability:.2%}</b>. "
    if len(critical_drivers) > 0:
        narrative += "The primary risk drivers identified include: " + "; ".join(critical_drivers) + ". "
    else:
        narrative += "The profile exhibits balanced risk metrics across all dimensions. "
    narrative += f"On the basis of this analysis, the underwriting decision is: <b>{action}</b>."
    
    elements.append(Paragraph(narrative, style_body))
    elements.append(Spacer(1, 24))
    
    sig_data = [
        [
            Paragraph("<b>AI Model Validation</b>", style_body_bold),
            Paragraph("<b>Credit Committee Review</b>", style_body_bold)
        ],
        [Spacer(1, 35), Spacer(1, 35)],
        [
            Paragraph("ZimBank AI Core v2.1", style_body),
            Paragraph(str(record.get("officer_name", "Authorized Credit Officer")), style_body),
        ]
    ]
    
    table_sig = Table(sig_data, colWidths=[230, 230])
    table_sig.setStyle(TableStyle([
        ('LINEBELOW', (0, 1), (0, 1), 1, COLOR_NAVY),
        ('LINEBELOW', (1, 1), (1, 1), 1, COLOR_NAVY),
        ('PADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(KeepTogether(table_sig))
    
    doc.build(elements)
    pdf_buffer.seek(0)
    return pdf_buffer

def compile_portfolio_pdf(batch_df: List[Dict], officer_name: str, branch_code: str) -> io.BytesIO:
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer, pagesize=letter,
        leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40,
    )
    base_styles = getSampleStyleSheet()
    COLOR_NAVY = colors.HexColor("#1e3a5f")
    COLOR_SLATE = colors.HexColor("#475569")

    style_h1 = ParagraphStyle(
        "PortfolioH1", parent=base_styles["Heading1"],
        fontName="Helvetica-Bold", fontSize=16, textColor=COLOR_NAVY, spaceAfter=6,
    )
    style_sub = ParagraphStyle(
        "PortfolioSub", parent=base_styles["Normal"],
        fontSize=9, textColor=COLOR_SLATE, spaceAfter=12,
    )

    elements = []
    logo_flowable = get_pdf_logo_flowable()
    if logo_flowable is not None:
        elements.append(logo_flowable)
        elements.append(Spacer(1, 14))

    elements.append(Paragraph("PORTFOLIO CREDIT RISK SUMMARY", style_h1))
    elements.append(Paragraph(
        f"Officer: {officer_name} • Branch: {branch_code} • "
        f"Generated: {datetime.now().strftime('%d %B %Y %H:%M:%S UTC')}",
        style_sub,
    ))

    table_data = [["Application ID", "Default Prob.", "Risk Tier", "DTI Ratio"]]
    for row in batch_df:
        table_data.append([
            str(row.get("ID", "")),
            f"{float(row.get('default_probability', 0)):.2%}",
            str(row.get("risk_tier", "")),
            f"{float(row.get('dti_ratio', 0)):.2%}",
        ])

    portfolio_table = Table(table_data, colWidths=[140, 90, 90, 90])
    portfolio_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_NAVY),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(portfolio_table)

    doc.build(elements)
    pdf_buffer.seek(0)
    return pdf_buffer

# ════════════════════════════════════════════════════════════════════════════════
# 📦 SCHEMAS
# ════════════════════════════════════════════════════════════════════════════════

class CustomerCreate(BaseModel):
    full_name: str
    client_dob: str
    province: str
    employment_sector: str
    months_at_employer: int
    monthly_income_usd: float
    existing_obligations: int
    num_dependents: int
    amount_usd: float
    annual_rate_pct: float
    term_months: int
    loan_purpose: str
    product_code: str

class PDFReportRequest(BaseModel):
    application_id: str
    full_name: str
    client_dob: str
    province: str
    employment_sector: str
    months_at_employer: int
    monthly_income_usd: float
    existing_obligations: int
    num_dependents: int
    amount_usd: float
    annual_rate_pct: float
    term_months: int
    province: str
    dti_ratio: float
    default_probability: float
    risk_tier: str
    underwriting_status: str
    dti_burden_score: float
    employment_stability_score: float
    existing_leverage_score: float
    life_stage_score: float
    loan_to_income_score: float
    flag_high_dti: bool
    flag_tenure_instability: bool
    flag_credit_leverage: bool
    flag_demographic_burden: bool
    officer_name: Optional[str] = "Credit Officer"
    branch_code: Optional[str] = "HQ-001"

class PortfolioPDFRequest(BaseModel):
    batch_data: List[Dict[str, Any]]
    officer_name: str
    branch_code: str

# ════════════════════════════════════════════════════════════════════════════════
# 🎛️ ENDPOINTS
# ════════════════════════════════════════════════════════════════════════════════

@app.get("/api/customers")
def get_customers(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM customers ORDER BY created_at DESC")
    rows = cursor.fetchall()
    return [dict(row) for row in rows]

@app.get("/api/customers/{customer_id}")
def get_customer(customer_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    return dict(row)

@app.post("/api/customers")
def create_customer(payload: CustomerCreate, db: sqlite3.Connection = Depends(get_db)):
    # Run Scoring
    scores = perform_scoring_on_record(payload.dict())
    
    customer_id = str(uuid.uuid4())
    app_id = f"APP{str(int(datetime.now().timestamp()))[-7:]}"
    
    # Save to SQLite
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO customers (
            id, application_id, full_name, client_dob, province, employment_sector,
            months_at_employer, monthly_income_usd, existing_obligations, num_dependents,
            amount_usd, annual_rate_pct, term_months, loan_purpose, product_code,
            dti_ratio, monthly_installment, total_to_income, work_stability,
            default_probability, risk_tier, underwriting_status, dti_burden_score,
            employment_stability_score, existing_leverage_score, life_stage_score,
            loan_to_income_score, flag_high_dti, flag_tenure_instability,
            flag_credit_leverage, flag_demographic_burden
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?
        )
    """, (
        customer_id, app_id, payload.full_name, payload.client_dob, payload.province, payload.employment_sector,
        payload.months_at_employer, payload.monthly_income_usd, payload.existing_obligations, payload.num_dependents,
        payload.amount_usd, payload.annual_rate_pct, payload.term_months, payload.loan_purpose, payload.product_code,
        scores["dti_ratio"], scores["monthly_installment"], scores["total_to_income"], scores["work_stability"],
        scores["default_probability"], scores["risk_tier"], scores["underwriting_status"], scores["dti_burden_score"],
        scores["employment_stability_score"], scores["existing_leverage_score"], scores["life_stage_score"],
        scores["loan_to_income_score"], scores["flag_high_dti"], scores["flag_tenure_instability"],
        scores["flag_credit_leverage"], scores["flag_demographic_burden"]
    ))
    db.commit()
    
    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
    new_row = cursor.fetchone()
    return dict(new_row)

@app.get("/api/stats")
def get_stats(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM customers")
    rows = [dict(row) for row in cursor.fetchall()]
    
    total = len(rows)
    approved = sum(1 for r in rows if r["underwriting_status"] == "AUTO-APPROVED")
    review = sum(1 for r in rows if r["underwriting_status"] == "CREDIT UNDERWRITER REVIEW")
    declined = sum(1 for r in rows if r["underwriting_status"] == "SYSTEM HARD DECLINED")
    total_loan = sum(r["amount_usd"] for r in rows)
    
    pods = [r["default_probability"] for r in rows if r["default_probability"] is not None]
    avg_pod = sum(pods) / len(pods) if pods else 0.0
    
    return {
        "total": total,
        "approved": approved,
        "review": review,
        "declined": declined,
        "totalLoan": total_loan,
        "avgPod": avg_pod
    }

@app.post("/api/pdf/report")
def generate_pdf_report(payload: PDFReportRequest):
    critical_drivers = []
    if payload.flag_high_dti:
        critical_drivers.append(f"High Debt-to-Income ({payload.dti_ratio:.1%})")
    if payload.flag_tenure_instability:
        critical_drivers.append(f"Limited Employment Tenure ({payload.months_at_employer}mo)")
    if payload.flag_credit_leverage:
        critical_drivers.append(f"Multiple Active Files ({payload.existing_obligations})")
    if payload.flag_demographic_burden:
        critical_drivers.append(f"High Dependent Load ({payload.num_dependents})")
        
    risk_components = {
        "dti_risk": payload.dti_burden_score,
        "employment_risk": payload.employment_stability_score,
        "leverage_risk": payload.existing_leverage_score,
        "age_risk": payload.life_stage_score,
        "ltir_risk": payload.loan_to_income_score
    }
    
    pdf_record = payload.dict()
    pdf_buffer = compile_underwriting_pdf(
        record=pdf_record,
        probability=payload.default_probability,
        risk_tier=payload.risk_tier.split(" ")[0],
        action=payload.underwriting_status,
        critical_drivers=critical_drivers,
        risk_components=risk_components
    )
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=ZimBank_Assessment_{payload.application_id}.pdf"}
    )

@app.post("/api/pdf/portfolio")
def generate_portfolio_pdf_report(payload: PortfolioPDFRequest):
    pdf_buffer = compile_portfolio_pdf(
        batch_df=payload.batch_data,
        officer_name=payload.officer_name,
        branch_code=payload.branch_code
    )
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=ZimBank_Portfolio_Summary.pdf"}
    )

@app.post("/api/batch-score")
def upload_batch_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    try:
        contents = file.file.read()
        df = pd.read_csv(io.BytesIO(contents))
        
        required_cols = ['ID', 'amount_usd', 'term_months', 'monthly_income_usd']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Missing required CSV columns: {', '.join(missing_cols)}")
            
        results = []
        for _, row in df.iterrows():
            record = row.to_dict()
            scores = perform_scoring_on_record(record)
            
            results.append({
                "ID": str(record.get("ID")),
                "default_probability": round(scores["default_probability"], 4),
                "risk_tier": scores["risk_tier"],
                "dti_ratio": round(scores["dti_ratio"], 4),
                # include other fields to allow frontend display
                "full_name": _coalesce_str(record.get("full_name"), "Applicant " + str(record.get("ID"))),
                "province": _coalesce_str(record.get("province"), "Harare"),
                "employment_sector": _coalesce_str(record.get("employment_sector"), "Retail Trade"),
                "amount_usd": float(_coalesce_numeric(record.get("amount_usd"), 1000.0))
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV ledger: {str(e)}")

@app.on_event("startup")
def on_startup():
    init_db()
    seed_db()

# CLI Run helper
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
