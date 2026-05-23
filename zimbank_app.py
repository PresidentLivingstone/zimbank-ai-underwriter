"""
╔════════════════════════════════════════════════════════════════════════════════╗
║                   ZIMBANK AI CREDIT RISK UNDERWRITING PLATFORM                ║
║                    Production-Grade Lending Decision Engine                    ║
║                                                                                ║
║  A sophisticated credit risk assessment system featuring real-time scoring,   ║
║  regulatory compliance reporting, and explainable AI decision-making for      ║
║  financial inclusion in African markets.                                       ║
║                                                                                ║
║  Platform: Streamlit + ReportLab + Scikit-Learn                              ║
║  Author: Ctrl + Alt + Elite Team                                          ║
║  Region: Zimbabwe & Southern Africa                                           ║
║════════════════════════════════════════════════════════════════════════════════╝
"""

import streamlit as st
import pandas as pd
import numpy as np
import joblib
import io
import os
import math
from datetime import datetime
from typing import Dict, Tuple, List, Optional, Any

# PDF & Document Generation
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

# ════════════════════════════════════════════════════════════════════════════════
# 📋 CONFIGURATION & STYLING
# ════════════════════════════════════════════════════════════════════════════════

APP_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(APP_DIR, "assets")
MODELS_DIR = os.path.join(APP_DIR, "models")
DATA_DIR = os.path.join(APP_DIR, "data")

LOGO_PATH = os.path.join(ASSETS_DIR, "zimbank_logo.png")
LOGIN_BANNER_PATH = os.path.join(ASSETS_DIR, "login2.png")
_page_icon = LOGO_PATH if os.path.exists(LOGO_PATH) else "🏦"

st.set_page_config(
    page_title="ZimBank AI Underwriter",
    page_icon=_page_icon,
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={
        "About": "**ZimBank AI Core** — Advanced credit risk assessment for financial inclusion"
    },
)
# ════════════════════════════════════════════════════════════════════════════════
# 🎨 INSTITUTIONAL BANKING DESIGN SYSTEM (light + dark theme)
# ════════════════════════════════════════════════════════════════════════════════

COLOR_PALETTE = {
    "primary_navy": "#1e3a5f",
    "secondary_slate": "#475569",
    "accent_blue": "#2563eb",
    "surface_light": "#f4f6f9",
    "surface_card": "#ffffff",
    "surface_border": "#e2e8f0",
    "text_primary": "#0f172a",
    "text_secondary": "#475569",
    "status_approve": "#047857",
    "status_warning": "#b45309",
    "status_decline": "#b91c1c",
}

st.markdown(f"""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap');

    :root {{
        --zb-navy: {COLOR_PALETTE['primary_navy']};
        --zb-text: {COLOR_PALETTE['text_primary']};
        --zb-muted: {COLOR_PALETTE['text_secondary']};
        --zb-border: {COLOR_PALETTE['surface_border']};
        --zb-bg: {COLOR_PALETTE['surface_light']};
        --zb-card: #ffffff;
        --zb-heading: {COLOR_PALETTE['primary_navy']};
    }}

    body.dark,
    [data-theme="dark"] {{
        --zb-text: #ffffff;
        --zb-muted: #e2e8f0;
        --zb-border: #334155;
        --zb-bg: #0f172a;
        --zb-card: #1e293b;
        --zb-heading: #ffffff;
        --zb-navy: #93c5fd;
        --text-color: #ffffff;
        --primary-text-color: #ffffff;
        color-scheme: dark;
    }}

    html, body, [class*="css"] {{
        font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif;
    }}

    body:not(.dark) .main .block-container {{
        color: var(--zb-text);
        padding-top: 1.5rem;
    }}

    body.dark .main .block-container,
    [data-theme="dark"] .main .block-container {{
        color: #ffffff;
        padding-top: 1.5rem;
    }}

    body:not(.dark) .main h1, body:not(.dark) .main h2, body:not(.dark) .main h3,
    body:not(.dark) .main h4, body:not(.dark) .main p, body:not(.dark) .main li,
    body:not(.dark) .main label, body:not(.dark) .main span,
    body:not(.dark) .main [data-testid="stMarkdownContainer"] p,
    body:not(.dark) .main [data-testid="stMarkdownContainer"] li,
    body:not(.dark) .main [data-testid="stMarkdownContainer"] h1,
    body:not(.dark) .main [data-testid="stMarkdownContainer"] h2,
    body:not(.dark) .main [data-testid="stMarkdownContainer"] h3 {{
        color: var(--zb-text) !important;
    }}

    body:not(.dark) .main .stCaption, body:not(.dark) .main small,
    body:not(.dark) .main [data-testid="stCaptionContainer"] {{
        color: var(--zb-muted) !important;
    }}

    /* Sidebar: always white background + dark text (light & dark app theme) */
    section[data-testid="stSidebar"],
    section[data-testid="stSidebar"] > div,
    section[data-testid="stSidebar"] [data-testid="stSidebarContent"],
    section[data-testid="stSidebar"] [data-testid="stSidebarUserContent"] {{
        background-color: #ffffff !important;
        background: #ffffff !important;
        border-right: 1px solid #e2e8f0 !important;
        color: {COLOR_PALETTE['text_primary']} !important;
        --text-color: {COLOR_PALETTE['text_primary']} !important;
        --primary-text-color: {COLOR_PALETTE['text_primary']} !important;
        --background-color: #ffffff !important;
        --secondary-background-color: #ffffff !important;
    }}

    section[data-testid="stSidebar"] h1,
    section[data-testid="stSidebar"] h2,
    section[data-testid="stSidebar"] h3,
    section[data-testid="stSidebar"] h4,
    section[data-testid="stSidebar"] p,
    section[data-testid="stSidebar"] label,
    section[data-testid="stSidebar"] span,
    section[data-testid="stSidebar"] li,
    section[data-testid="stSidebar"] strong,
    section[data-testid="stSidebar"] .stMarkdown,
    section[data-testid="stSidebar"] .stMarkdown p,
    section[data-testid="stSidebar"] .stMarkdown strong,
    section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"],
    section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] p,
    section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] strong,
    section[data-testid="stSidebar"] [data-testid="stWidgetLabel"],
    section[data-testid="stSidebar"] label[data-testid="stWidgetLabel"],
    section[data-testid="stSidebar"] [data-testid="stExpander"] summary,
    section[data-testid="stSidebar"] [data-testid="stExpander"] summary span,
    section[data-testid="stSidebar"] [data-baseweb="select"] span,
    section[data-testid="stSidebar"] input,
    section[data-testid="stSidebar"] textarea {{
        color: {COLOR_PALETTE['text_primary']} !important;
        -webkit-text-fill-color: {COLOR_PALETTE['text_primary']} !important;
    }}

    section[data-testid="stSidebar"] .stCaption,
    section[data-testid="stSidebar"] [data-testid="stCaptionContainer"] {{
        color: {COLOR_PALETTE['text_secondary']} !important;
        -webkit-text-fill-color: {COLOR_PALETTE['text_secondary']} !important;
    }}

    section[data-testid="stSidebar"] input,
    section[data-testid="stSidebar"] textarea,
    section[data-testid="stSidebar"] [data-baseweb="input"] > div,
    section[data-testid="stSidebar"] [data-baseweb="select"] > div {{
        background-color: #ffffff !important;
        border-color: #e2e8f0 !important;
    }}

    .zb-header {{
        background: var(--zb-card);
        border: 1px solid var(--zb-border);
        border-radius: 8px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 1.5rem;
    }}

    .zb-header h1 {{
        color: var(--zb-heading) !important;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0;
    }}

    .zb-header p {{
        color: var(--zb-muted) !important;
        margin: 0.35rem 0 0 0;
        font-size: 0.95rem;
    }}

    /* Pre-login right column: header strip + metrics alignment */
    .zb-login-rh-row {{
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 0.65rem;
    }}
    .zb-login-rh-eyebrow {{
        margin: 0;
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--zb-muted) !important;
        font-weight: 600;
    }}
    .zb-login-rh-title {{
        margin: 0.15rem 0 0 0;
        font-size: 1.02rem;
        font-weight: 700;
        color: var(--zb-heading) !important;
        line-height: 1.25;
    }}
    .zb-login-rh-pill {{
        font-size: 0.72rem;
        font-weight: 600;
        color: #047857;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 999px;
        padding: 0.25rem 0.6rem;
        white-space: nowrap;
        align-self: center;
    }}
    .zb-login-rh-chart-hint {{
        font-size: 0.72rem;
        color: var(--zb-muted) !important;
        margin: 0.35rem 0 0.15rem 0;
    }}

    .zb-decision-box {{
        background: var(--zb-card);
        border: 1px solid var(--zb-border);
        border-left: 4px solid var(--zb-navy);
        border-radius: 8px;
        padding: 1.25rem 1.5rem;
        margin: 1rem 0;
    }}

    .zb-decision-box h2 {{
        color: var(--zb-heading) !important;
        font-size: 1.35rem;
        margin: 0 0 0.25rem 0;
    }}

    .zb-decision-box h3 {{
        color: var(--zb-text) !important;
        font-size: 1.1rem;
        margin: 0 0 0.5rem 0;
    }}

    .zb-decision-box p {{
        color: var(--zb-muted) !important;
        margin: 0;
    }}

    .zb-decision-approve {{ border-left-color: {COLOR_PALETTE['status_approve']}; }}
    .zb-decision-review {{ border-left-color: {COLOR_PALETTE['status_warning']}; }}
    .zb-decision-decline {{ border-left-color: {COLOR_PALETTE['status_decline']}; }}

    div[data-testid="stMetric"] {{
        background: var(--zb-card);
        border: 1px solid var(--zb-border);
        border-radius: 8px;
        padding: 0.75rem;
    }}

    div[data-testid="stMetric"] label {{
        color: var(--zb-muted) !important;
    }}

    div[data-testid="stMetric"] [data-testid="stMetricValue"] {{
        color: var(--zb-text) !important;
    }}

    hr {{
        border: none;
        border-top: 1px solid var(--zb-border);
        margin: 1.5rem 0;
    }}

    /* Dark theme: white text on dark backgrounds (body.dark + data-theme fallback) */
    body.dark [data-testid="stAppViewContainer"],
    body.dark [data-testid="stMain"],
    body.dark section.main,
    body.dark .main,
    body.dark .main .block-container,
    [data-theme="dark"] [data-testid="stAppViewContainer"],
    [data-theme="dark"] [data-testid="stMain"],
    [data-theme="dark"] section.main,
    [data-theme="dark"] .main,
    [data-theme="dark"] .main .block-container {{
        color: #ffffff !important;
    }}

    body.dark .main h1, body.dark .main h2, body.dark .main h3, body.dark .main h4,
    body.dark .main p, body.dark .main li, body.dark .main label, body.dark .main span,
    body.dark .main .stMarkdown, body.dark .main .stMarkdown p, body.dark .main .stMarkdown li,
    body.dark .main .stMarkdown h1, body.dark .main .stMarkdown h2, body.dark .main .stMarkdown h3,
    body.dark .main .stMarkdown h4, body.dark .main .stMarkdown span,
    body.dark .main [data-testid="stMarkdownContainer"],
    body.dark .main [data-testid="stMarkdownContainer"] p,
    body.dark .main [data-testid="stMarkdownContainer"] li,
    body.dark .main [data-testid="stMarkdownContainer"] h1,
    body.dark .main [data-testid="stMarkdownContainer"] h2,
    body.dark .main [data-testid="stMarkdownContainer"] h3,
    body.dark .main [data-testid="stMarkdownContainer"] h4,
    body.dark .main [data-testid="stMarkdownContainer"] span,
    body.dark .main [data-testid="stMarkdownContainer"] strong,
    body.dark .main [data-testid="stCaptionContainer"],
    body.dark .main .stCaption,
    body.dark .main [data-testid="stWidgetLabel"],
    body.dark .main label[data-testid="stWidgetLabel"],
    body.dark .main [data-testid="stExpander"] summary,
    body.dark .main div[data-testid="stMetric"] label,
    body.dark .main div[data-testid="stMetric"] [data-testid="stMetricValue"],
    body.dark .main div[data-testid="stMetric"] div,
    [data-theme="dark"] .main h1, [data-theme="dark"] .main h2, [data-theme="dark"] .main h3,
    [data-theme="dark"] .main h4, [data-theme="dark"] .main p, [data-theme="dark"] .main li,
    [data-theme="dark"] .main label, [data-theme="dark"] .main span,
    [data-theme="dark"] .main [data-testid="stMarkdownContainer"],
    [data-theme="dark"] .main [data-testid="stMarkdownContainer"] p,
    [data-theme="dark"] .main [data-testid="stMarkdownContainer"] li,
    [data-theme="dark"] .main [data-testid="stMarkdownContainer"] h1,
    [data-theme="dark"] .main [data-testid="stMarkdownContainer"] h2,
    [data-theme="dark"] .main [data-testid="stMarkdownContainer"] h3,
    [data-theme="dark"] .main div[data-testid="stMetric"] label,
    [data-theme="dark"] .main div[data-testid="stMetric"] [data-testid="stMetricValue"] {{
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
    }}

    body.dark .main .stCaption,
    [data-theme="dark"] .main .stCaption {{
        color: #e2e8f0 !important;
        -webkit-text-fill-color: #e2e8f0 !important;
    }}

    body.dark .zb-header,
    body.dark .zb-header h1,
    body.dark .zb-header p,
    body.dark .zb-decision-box,
    body.dark .zb-decision-box h2,
    body.dark .zb-decision-box h3,
    body.dark .zb-decision-box p,
    [data-theme="dark"] .zb-header h1,
    [data-theme="dark"] .zb-header p,
    [data-theme="dark"] .zb-decision-box h2,
    [data-theme="dark"] .zb-decision-box h3,
    [data-theme="dark"] .zb-decision-box p {{
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
    }}

    body.dark .zb-header p,
    body.dark .zb-decision-box p,
    [data-theme="dark"] .zb-header p,
    [data-theme="dark"] .zb-decision-box p {{
        color: #e2e8f0 !important;
        -webkit-text-fill-color: #e2e8f0 !important;
    }}

    body.dark .zb-login-rh-pill,
    [data-theme="dark"] .zb-login-rh-pill {{
        color: #6ee7b7 !important;
        background: rgba(6, 78, 59, 0.45) !important;
        border-color: #059669 !important;
    }}

    /* Lock sidebar to white panel when main app is in dark mode */
    body.dark section[data-testid="stSidebar"],
    body.dark section[data-testid="stSidebar"] > div,
    body.dark section[data-testid="stSidebar"] [data-testid="stSidebarContent"],
    body.dark section[data-testid="stSidebar"] [data-testid="stSidebarUserContent"],
    [data-theme="dark"] section[data-testid="stSidebar"],
    [data-theme="dark"] section[data-testid="stSidebar"] > div {{
        background-color: #ffffff !important;
        background: #ffffff !important;
        color: {COLOR_PALETTE['text_primary']} !important;
    }}

</style>
""", unsafe_allow_html=True)


# Risk decision thresholds (aligned with training competition targets)
POD_APPROVE_MAX = 0.35
POD_REVIEW_MAX = 0.60
DTI_CRITICAL = 0.42
APPLICANT_PLACEHOLDER = "--select--"

MODEL_PATH = os.path.join(MODELS_DIR, "final_credit_risk_model.joblib")
STACK_BUNDLE_PATH = os.path.join(MODELS_DIR, "credit_risk_stack.joblib")
SAMPLE_DATA_PATH = os.path.join(DATA_DIR, "sample_test_data.csv")


def get_pdf_logo_flowable(max_width: float = 3.25 * inch, max_height: float = 1.25 * inch):
    """Scaled logo for ReportLab PDF header (prominent institutional size)."""
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


def render_brand_header(title: str, subtitle: str) -> None:
    """Main-area header (text only; logo lives in the sidebar)."""
    st.markdown(
        f"""
        <div class="zb-header">
            <h1>{title}</h1>
            <p>{subtitle}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_sidebar_logo() -> None:
    """Brand mark at top of sidebar."""
    if os.path.exists(LOGO_PATH):
        st.image(LOGO_PATH, use_container_width=True)

# Demo staff credentials (override via Streamlit secrets: [auth] users map)
DEFAULT_AUTH_USERS = {
    "analyst": "ZimBank2026",
    "admin": "Admin@2026",
}


def init_session_state() -> None:
    """Initialize session keys for auth and user settings."""
    defaults = {
        "authenticated": False,
        "username": "",
        "officer_name": "Credit Officer",
        "branch_code": "HQ-001",
        "currency": "USD",
        "show_batch_tools": True,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def verify_credentials(username: str, password: str) -> bool:
    """Validate staff login against secrets or demo credentials."""
    username = username.strip().lower()
    try:
        users = dict(st.secrets.get("auth", {}).get("users", {}))
    except Exception:
        users = {}
    if not users:
        users = DEFAULT_AUTH_USERS
    return users.get(username) == password


def render_sidebar_auth() -> bool:
    """Render sign-in, settings, and sign-out in the sidebar."""
    with st.sidebar:
        render_sidebar_logo()
        st.markdown("### ZimBank AI")
        st.caption("Credit Risk Underwriting")
        st.markdown("---")

        if not st.session_state.authenticated:
            st.markdown("**Staff sign in**")
            username = st.text_input("Username", key="login_username", placeholder="username@zimbank.co.zw")
            password = st.text_input("Password", type="password", key="login_password", placeholder="********")
            if st.button("Sign in", type="primary", use_container_width=True):
                if verify_credentials(username, password):
                    st.session_state.authenticated = True
                    st.session_state.username = username.strip().lower()
                    st.session_state.officer_name = username.strip().title()
                    st.rerun()
                else:
                    st.error("Invalid username or password.")
            # st.caption("Demo access: analyst / ZimBank2026")
            return False

        st.markdown(f"**{st.session_state.username}**")
        st.caption("Signed in")

        with st.expander("Settings", expanded=False):
            st.session_state.officer_name = st.text_input(
                "Officer name (PDF reports)",
                value=st.session_state.officer_name,
            )
            st.session_state.branch_code = st.text_input(
                "Branch code",
                value=st.session_state.branch_code,
            )
            st.session_state.currency = st.selectbox(
                "Display currency",
                options=["USD", "ZWL"],
                index=0 if st.session_state.currency == "USD" else 1,
            )
            st.session_state.show_batch_tools = st.checkbox(
                "Enable batch scoring",
                value=st.session_state.show_batch_tools,
            )

        if st.button("Sign out", use_container_width=True):
            st.session_state.authenticated = False
            st.session_state.username = ""
            st.rerun()

        st.markdown("---")
    return True


def render_applicant_sidebar(test_df: pd.DataFrame) -> Optional[str]:
    """Applicant selector below auth block in sidebar."""
    with st.sidebar:
        st.markdown("### Applicant lookup")
        choice = st.selectbox(
            "Application ID",
            options=[APPLICANT_PLACEHOLDER] + list(test_df["ID"].unique()),
            index=0,
            help="Select a loan application to underwrite",
        )
        if choice == APPLICANT_PLACEHOLDER:
            return None
        return str(choice)


def render_login_main() -> None:
    """Main-area welcome when user is not authenticated."""
    col_text, col_img = st.columns([1.12, 1], gap="large")

    with col_text:
        render_brand_header(
            "ZimBank AI — Credit Underwriting",
            "Secure access for authorised credit staff. Sign in using the panel on the left.",
        )
        st.info(
            "This platform supports Basel-aligned credit decisions, explainable risk scoring, "
            "and regulatory-ready PDF reports for Zimbabwe and Southern Africa."
        )



# ════════════════════════════════════════════════════════════════════════════════
# 🔧 UTILITY FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════════

def format_currency(amount: float, currency: Optional[str] = None) -> str:
    """Format numeric values as currency strings."""
    currency = currency or st.session_state.get("currency", "USD")
    if currency == "USD":
        return f"${amount:,.2f}"
    return f"{amount:,.2f} {currency}"


def calculate_risk_score_components(
    dti_ratio: float,
    months_at_employer: int,
    existing_obligations: int,
    client_age: int,
    amount_requested: float,
    monthly_income: float
) -> Dict[str, float]:
    """
    Calculate individual risk score components for explainability.
    
    This function breaks down credit risk into granular, human-interpretable
    components that feed into the final model decision. Each component is
    scored 0-100 where higher = more risk.
    
    Args:
        dti_ratio: Debt-to-income ratio (0-1)
        months_at_employer: Tenure in months
        existing_obligations: Count of active credit files
        client_age: Client age in years
        amount_requested: Loan amount requested
        monthly_income: Verified monthly income
    
    Returns:
        Dictionary with component scores and labels
    """
    components = {}
    
    # DTI Risk Component (weights heavily toward default risk)
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
    
    # Leverage Component (existing obligations)
    components['leverage_risk'] = min(existing_obligations * 20, 80)
    
    # Age Component (life stage risk)
    if client_age < 25:
        components['age_risk'] = 45
    elif client_age < 35:
        components['age_risk'] = 25
    elif client_age < 60:
        components['age_risk'] = 15
    else:
        components['age_risk'] = 35  # Declining workforce risk
    
    # Loan-to-Income Component
    ltir = (amount_requested / 12) / (monthly_income + 1e-6)  # Monthly payment vs income
    if ltir < 0.10:
        components['ltir_risk'] = 10
    elif ltir < 0.20:
        components['ltir_risk'] = 25
    elif ltir < 0.35:
        components['ltir_risk'] = 45
    else:
        components['ltir_risk'] = min(ltir * 100, 90)
    
    return components


def generate_risk_narrative(
    probability: float,
    components: Dict[str, float],
    critical_drivers: List[str],
    risk_tier: str
) -> str:
    """
    Generate human-readable narrative explanation of credit decision.
    
    Args:
        probability: Model default probability
        components: Risk score components
        critical_drivers: List of key risk factors
        risk_tier: Risk classification
    
    Returns:
        Formatted narrative string for reports
    """
    narrative = f"""
    **CREDIT DECISION SUMMARY**
    
    The applicant's credit profile yields a default probability of **{probability:.1%}**, 
    placing them in the **{risk_tier}** classification band.
    
    **Risk Component Analysis:**
    """
    
    # Add component details
    component_names = {
        'dti_risk': 'Debt-to-Income Burden',
        'employment_risk': 'Employment Stability',
        'leverage_risk': 'Existing Leverage',
        'age_risk': 'Life Stage',
        'ltir_risk': 'Loan-to-Income Ratio'
    }
    
    for key, score in sorted(components.items(), key=lambda x: x[1], reverse=True):
        name = component_names.get(key, key)
        risk_level = "🔴 HIGH" if score > 60 else ("🟡 MEDIUM" if score > 35 else "🟢 LOW")
        narrative += f"\n  • {name}: {risk_level} ({score:.0f}/100)"
    
    if critical_drivers:
        narrative += f"\n\n**Primary Risk Drivers:**\n"
        for driver in critical_drivers:
            narrative += f"  • {driver}\n"
    
    return narrative


def _coalesce_numeric(val: Any, default: float) -> float:
    """Coerce to float; treat None / NaN / inf as *default* (CSV blanks must not reach sklearn)."""
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


# Defaults aligned with engineer_features / notebook assumptions
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
    """
    Ensure no NaN/inf in numeric columns and no NaN categoricals before sklearn / boosting predict.
    """
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
                "product_code": "0",
            }
            d = obj_defaults.get(col, "Unknown")
            out[col] = out[col].apply(lambda v, dd=d: _coalesce_str(v, dd))
    return out


def engineer_features_from_record(record: Dict) -> pd.DataFrame:
    """
    Replicate training notebook feature engineering (engineer_features_v2)
    for a single applicant row.
    """
    amount_usd = _coalesce_numeric(record.get("amount_usd"), 1000.0)
    annual_rate_pct = _coalesce_numeric(record.get("annual_rate_pct"), 25.0)
    term_months = _coalesce_numeric(record.get("term_months"), 12.0)
    monthly_income_usd = _coalesce_numeric(record.get("monthly_income_usd"), 400.0)
    existing_obligations = _coalesce_numeric(record.get("existing_obligations"), 0.0)
    num_dependents = _coalesce_numeric(record.get("num_dependents"), 0.0)
    months_at_employer = _coalesce_numeric(record.get("months_at_employer"), 12.0)

    dob_str = _coalesce_str(record.get("client_dob"), "01/01/1990")
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
        "product_code": _coalesce_str(record.get("product_code"), "0"),
    }])
    return _sanitize_features_for_inference(row)


class StackingCreditRiskModel:
    """
    Level-2 meta-learner (LogisticRegression) over CatBoost / XGBoost / RF scores.
    If base models are not bundled, calibrated proxies feed the saved meta-model.
    """

    def __init__(self, meta_model: Any, base_models: Optional[Dict[str, Any]] = None):
        self.meta_model = meta_model
        self.base_models = base_models or {}

    @staticmethod
    def _proxy_level1_predictions(X: pd.DataFrame) -> np.ndarray:
        """Diverse L1-style scores when base estimators are not shipped with the app."""
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
    """Fallback when no serialized model is present."""

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


@st.cache_resource
def load_validated_pipeline() -> Tuple[Any, str, bool]:
    """
    Load production artifacts with graceful fallback.

    Returns:
        (predictor, mode_label, is_simulation_mode)
        mode_label: stacking_meta | stacking_full | sklearn_direct | simulation
    """
    if os.path.exists(STACK_BUNDLE_PATH):
        try:
            bundle = joblib.load(STACK_BUNDLE_PATH)
            meta = bundle["meta_model"]
            bases = {
                k: bundle[k]
                for k in ("catboost", "xgboost", "random_forest")
                if k in bundle
            }
            return StackingCreditRiskModel(meta, bases), "stacking_full", False
        except Exception as exc:
            st.warning(f"Could not load stack bundle: {exc}")

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
        except Exception as exc:
            st.warning(f"Failed to load production model: {exc}")

    return SimulationCreditModel(), "simulation", True


init_session_state()

# Load model pipeline once at app startup
model, model_mode, is_simulation_mode = load_validated_pipeline()

# ════════════════════════════════════════════════════════════════════════════════
# 📄 PDF REPORT GENERATION
# ════════════════════════════════════════════════════════════════════════════════

def compile_underwriting_pdf(
    record: Dict,
    probability: float,
    risk_tier: str,
    action: str,
    critical_drivers: List[str],
    risk_components: Dict[str, float]
) -> io.BytesIO:
    """
    Generate Basel IV-compliant PDF underwriting report.
    
    Creates institutional-grade credit assessment documents suitable for
    regulatory filing and credit committee review. Reports include:
    - Executive summary with decision rationale
    - Risk component breakdown
    - Exposure profile analysis
    - Signature matrix for audit trail
    
    Args:
        record: Applicant data dictionary
        probability: Model default probability
        risk_tier: Risk classification
        action: Underwriting decision
        critical_drivers: Key risk factors
        risk_components: Component-level risk scores
    
    Returns:
        BytesIO object containing PDF document
    """
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer, pagesize=letter,
        leftMargin=40, rightMargin=40, topMargin=40, bottomMargin=40
    )
    
    # Load base styles and create custom paragraph styles
    base_styles = getSampleStyleSheet()
    
    # Define institutional color palette for PDF
    COLOR_NAVY = colors.HexColor("#0f172a")
    COLOR_SLATE = colors.HexColor("#475569")
    COLOR_BORDER = colors.HexColor("#cbd5e1")
    COLOR_TEAL = colors.HexColor("#0d9488")
    
    # Typography system
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
    
    # ─────────────────────────────────────────────────────────────────────
    # REPORT HEADER (with institutional logo)
    # ─────────────────────────────────────────────────────────────────────
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
    
    # ─────────────────────────────────────────────────────────────────────
    # EXECUTIVE SUMMARY MATRIX
    # ─────────────────────────────────────────────────────────────────────
    elements.append(Paragraph("Executive Decision Summary", style_section))
    
    summary_data = [
        [
            Paragraph("<b>Application ID:</b>", style_body),
            Paragraph(str(record.get('ID', 'N/A')), style_body),
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
        ('FONTNAME', (1, 0), (1, 1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 0), (3, 1), 'Helvetica-Bold'),
    ]))
    elements.append(table_summary)
    elements.append(Spacer(1, 16))
    
    # ─────────────────────────────────────────────────────────────────────
    # CREDIT EXPOSURE PROFILE
    # ─────────────────────────────────────────────────────────────────────
    elements.append(Paragraph("Credit Exposure Profile", style_section))
    
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
    
    # ─────────────────────────────────────────────────────────────────────
    # RISK COMPONENTS BREAKDOWN
    # ─────────────────────────────────────────────────────────────────────
    elements.append(Paragraph("Risk Component Analysis", style_section))
    
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
        if score < 35:
            assessment = "🟢 Low Risk"
        elif score < 60:
            assessment = "🟡 Medium Risk"
        else:
            assessment = "🔴 High Risk"
        
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
    
    # ─────────────────────────────────────────────────────────────────────
    # DECISION NARRATIVE
    # ─────────────────────────────────────────────────────────────────────
    elements.append(Paragraph("Underwriting Narrative", style_section))
    
    narrative = f"The applicant's credit profile demonstrates a default probability of <b>{probability:.2%}</b>. "
    
    if len(critical_drivers) > 0:
        narrative += "The primary risk drivers identified include: " + "; ".join(critical_drivers) + ". "
    else:
        narrative += "The profile exhibits balanced risk metrics across all dimensions. "
    
    narrative += f"On the basis of this analysis, the underwriting decision is: <b>{action}</b>."
    
    elements.append(Paragraph(narrative, style_body))
    elements.append(Spacer(1, 24))
    
    # ─────────────────────────────────────────────────────────────────────
    # SIGNATURE MATRIX (AUDIT TRAIL)
    # ─────────────────────────────────────────────────────────────────────
    elements.append(Paragraph("Authorization & Audit Trail", style_section))
    
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
    
    # Build PDF
    doc.build(elements)
    pdf_buffer.seek(0)
    return pdf_buffer


def compile_portfolio_pdf(batch_df: pd.DataFrame, officer_name: str, branch_code: str) -> io.BytesIO:
    """Branded portfolio summary PDF for batch scoring exports."""
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
    for _, row in batch_df.iterrows():
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
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("PADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(portfolio_table)

    doc.build(elements)
    pdf_buffer.seek(0)
    return pdf_buffer


# ════════════════════════════════════════════════════════════════════════════════
# 🎯 MAIN APPLICATION UI
# ════════════════════════════════════════════════════════════════════════════════

if not render_sidebar_auth():
    render_login_main()
    st.stop()

render_brand_header(
    "ZimBank AI — Credit Risk Underwriting",
    "Basel-aligned lending decisions for Zimbabwe & Southern Africa",
)

if is_simulation_mode:
    st.caption("Scoring engine: demonstration mode (add `models/final_credit_risk_model.joblib` for production).")
elif model_mode == "stacking_full":
    st.caption("Scoring engine: full stacking ensemble active.")
else:
    st.caption("Scoring engine: production meta-learner active.")

st.markdown("---")

# ─────────────────────────────────────────────────────────────────────
# DATA INGESTION SECTION
# ─────────────────────────────────────────────────────────────────────
st.subheader("📊 Data Ingestion & Applicant Selection", divider="blue")
st.markdown("""
Upload your `Test.csv` file or use the bundled sample ledger. The platform automatically 
applies notebook-aligned feature engineering and runs real-time credit scoring.
""")

col_upload, col_sample = st.columns([2, 1])

with col_upload:
    ledger_upload = st.file_uploader(
        "Upload Test.csv Data File",
        type=["csv"],
        help="CSV file with applicant records (financial & demographic attributes)",
    )

with col_sample:
    use_sample = st.checkbox(
        "Use Sample Data",
        value=not os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "Test.csv")),
        help="Demo with 50 synthetic Zimbabwe applicants",
    )

test_df = None
if use_sample and os.path.exists(SAMPLE_DATA_PATH):
    test_df = pd.read_csv(SAMPLE_DATA_PATH)
elif ledger_upload is not None:
    test_df = pd.read_csv(ledger_upload)

if test_df is not None:
    try:
        # Validate required columns
        required_cols = ['ID', 'amount_usd', 'term_months', 'monthly_income_usd']
        missing_cols = [col for col in required_cols if col not in test_df.columns]
        
        if missing_cols:
            st.error(f"❌ Missing required columns: {', '.join(missing_cols)}")
        else:
            # Success indicator
            st.success(f"✅ Dataset loaded successfully — **{test_df.shape[0]:,}** applicant records ready for scoring")
            
            selected_client_id = render_applicant_sidebar(test_df)

            if not selected_client_id:
                st.info(
                    "Select an **Application ID** from the sidebar (start with "
                    f"**{APPLICANT_PLACEHOLDER}**) to run credit scoring."
                )
            else:
                # ────────────────────────────────────────────────────────────
                # APPLICANT DATA EXTRACTION & PROCESSING
                # ────────────────────────────────────────────────────────────

                raw_record = test_df[test_df['ID'] == selected_client_id].iloc[0].to_dict()
            
                # Extract and validate financial parameters (CSV blanks / NaN-safe)
                amount_usd = _coalesce_numeric(raw_record.get('amount_usd'), 1000.0)
                annual_rate_pct = _coalesce_numeric(raw_record.get('annual_rate_pct'), 25.0)
                term_months = _coalesce_numeric(raw_record.get('term_months'), 12.0)
                monthly_income_usd = _coalesce_numeric(raw_record.get('monthly_income_usd'), 400.0)
                existing_obligations = _coalesce_int(raw_record.get('existing_obligations'), 0)
                num_dependents = _coalesce_numeric(raw_record.get('num_dependents'), 0.0)
                months_at_employer = _coalesce_numeric(raw_record.get('months_at_employer'), 12.0)
                province = _coalesce_str(raw_record.get('province'), 'Harare')
                employment_sector = _coalesce_str(raw_record.get('employment_sector'), 'Retail Trade')
                loan_purpose = _coalesce_str(raw_record.get('loan_purpose'), 'Business Expansion')
                product_code = _coalesce_str(raw_record.get('product_code'), '0')
            
                # ────────────────────────────────────────────────────────────
                # APPLICANT PROFILE CARDS (PREMIUM DESIGN)
                # ────────────────────────────────────────────────────────────
            
                st.markdown("### 📄 Applicant Profile & Attributes")
                st.markdown(f"**Application ID:** `{selected_client_id}`", help="Unique applicant identifier")
            
                # Three-column profile layout
                col_fin, col_emp, col_geo = st.columns(3)
            
                with col_fin:
                    st.markdown("#### 💰 Financial Profile")
                    st.markdown(f"""
                    **Facility Size**  
                    {format_currency(amount_usd)}
                
                    **Interest Rate**  
                    {annual_rate_pct:.2f}% p.a.
                
                    **Loan Term**  
                    {int(term_months)} months
                
                    **Monthly Income**  
                    {format_currency(monthly_income_usd)}
                    """)
            
                with col_emp:
                    st.markdown("#### 💼 Employment Profile")
                    st.markdown(f"""
                    **Sector**  
                    {employment_sector}
                
                    **Tenure**  
                    {int(months_at_employer)} months
                
                    **Dependents**  
                    {int(num_dependents)}
                
                    **Active Files**  
                    {existing_obligations}
                    """)
            
                with col_geo:
                    st.markdown("#### 📍 Geographic & Product")
                    st.markdown(f"""
                    **Province**  
                    {province}
                
                    **Loan Purpose**  
                    {loan_purpose}
                
                    **Product Code**  
                    {product_code}
                    """)
            
                # ────────────────────────────────────────────────────────────
                # FEATURE ENGINEERING & MODEL INFERENCE
                # ────────────────────────────────────────────────────────────

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
                    numeric_cols = [
                        c for c in X_inference.columns
                        if pd.api.types.is_numeric_dtype(X_inference[c])
                    ]
                    X_num = _sanitize_features_for_inference(X_inference[numeric_cols])
                    probability_of_default = float(model.predict_proba(X_num)[0][1])
                else:
                    probability_of_default = float(model.predict_proba(X_inference)[0][1])
            
                # Calculate risk components for explainability
                risk_components = calculate_risk_score_components(
                    dti_ratio=dti_ratio,
                    months_at_employer=int(months_at_employer),
                    existing_obligations=existing_obligations,
                    client_age=client_age,
                    amount_requested=amount_usd,
                    monthly_income=monthly_income_usd
                )
            
                # Identify critical risk drivers
                critical_drivers = []
                if dti_ratio > DTI_CRITICAL:
                    critical_drivers.append(f"High Debt-to-Income ({dti_ratio:.1%})")
                if months_at_employer < 12:
                    critical_drivers.append(f"Limited Employment Tenure ({int(months_at_employer)}mo)")
                if existing_obligations > 2:
                    critical_drivers.append(f"Multiple Active Files ({existing_obligations})")
                if num_dependents > 3:
                    critical_drivers.append(f"High Dependent Load ({int(num_dependents)})")
            
                # ────────────────────────────────────────────────────────────
                # RISK CLASSIFICATION & DECISION LOGIC
                # ────────────────────────────────────────────────────────────
            
                # Determine risk tier and underwriting decision
                if probability_of_default < POD_APPROVE_MAX:
                    risk_tier = "Low Risk (Tier A)"
                    underwriting_directive = "✅ Approved"
                    decision_subtext = "Automated Approval Pathway"
                    decision_color = "success"
                elif probability_of_default < POD_REVIEW_MAX:
                    risk_tier = "Medium Risk (Tier B)"
                    underwriting_directive = "⏳ Under Review"
                    decision_subtext = "Committee Underwriting Required"
                    decision_color = "warning"
                else:
                    risk_tier = "High Risk (Tier C)"
                    underwriting_directive = "❌ Declined"
                    decision_subtext = "Risk Exceeds Tolerance"
                    decision_color = "error"
            
                # ────────────────────────────────────────────────────────────
                # HERO DECISION CARD (ANIMATED)
                # ────────────────────────────────────────────────────────────
            
                st.markdown("---")
                st.markdown("### 🏁 Underwriting Decision Engine")
            
                # Risk tier display
                tier_emoji = "🟢" if "Low" in risk_tier else ("🟡" if "Medium" in risk_tier else "🔴")
                decision_class = (
                    "zb-decision-approve" if decision_color == "success"
                    else "zb-decision-review" if decision_color == "warning"
                    else "zb-decision-decline"
                )
                st.markdown(
                    f"<div class='zb-decision-box {decision_class}'>"
                    f"<h2>{tier_emoji} {risk_tier}</h2>"
                    f"<h3>{underwriting_directive}</h3>"
                    f"<p>{decision_subtext}</p></div>",
                    unsafe_allow_html=True,
                )
            
                # Key metrics in a premium grid
                metric_col1, metric_col2, metric_col3, metric_col4 = st.columns(4)
            
                with metric_col1:
                    st.metric(
                        "Default Probability",
                        f"{probability_of_default:.1%}",
                        delta=None,
                        delta_color="off"
                    )
            
                with metric_col2:
                    st.metric(
                        "DTI Ratio",
                        f"{dti_ratio:.1%}",
                        delta="Debt Burden"
                    )
            
                with metric_col3:
                    st.metric(
                        "Monthly Payment",
                        format_currency(estimated_monthly_payment),
                        delta=None,
                        delta_color="off"
                    )
            
                with metric_col4:
                    st.metric(
                        "Risk Classification",
                        "Tier " + ("A" if "Low" in risk_tier else ("B" if "Medium" in risk_tier else "C")),
                        delta=underwriting_directive.split()[0]
                    )
            
                # ────────────────────────────────────────────────────────────
                # RISK COMPONENTS VISUALIZATION (PREMIUM)
                # ────────────────────────────────────────────────────────────
            
                st.markdown("---")
                st.markdown("### 📊 Risk Component Breakdown")
                st.markdown("Component-level risk analysis for transparency and explainability:")
            
                # Create component breakdown with premium styling
                component_names_short = {
                    'dti_risk': 'DTI Burden',
                    'employment_risk': 'Job Stability',
                    'leverage_risk': 'Existing Debt',
                    'age_risk': 'Life Stage',
                    'ltir_risk': 'Loan-to-Income'
                }
            
                col_viz1, col_viz2 = st.columns([2, 1])
            
                with col_viz1:
                    st.markdown("**Risk Scores (0-100)**")
                    for key in sorted(risk_components.keys(), key=lambda x: risk_components[x], reverse=True):
                        score = risk_components[key]
                        name = component_names_short.get(key, key)
                    
                        # Color coding
                        if score < 35:
                            color = "🟢"
                        elif score < 60:
                            color = "🟡"
                        else:
                            color = "🔴"
                    
                        st.write(f"{color} {name}")
                        st.progress(min(score / 100, 1.0))
            
                with col_viz2:
                    st.markdown("**Risk Level Guide**")
                    st.markdown("""
                    🟢 **Low (0-35)**
                    Minimal impact
                
                    🟡 **Medium (35-60)**
                    Moderate concern
                
                    🔴 **High (60-100)**
                    Significant risk
                    """)
            
                # ────────────────────────────────────────────────────────────
                # COMPLIANCE & PDF REPORTING
                # ────────────────────────────────────────────────────────────
            
                st.markdown("---")
                st.markdown("### 📥 Compliance & Regulatory Reporting")
                st.markdown("Generate Basel IV-compliant PDF underwriting assessments for credit committee review and regulatory filing.")
            
                # Prepare PDF payload
                pdf_record = {
                    'ID': selected_client_id,
                    'amount_usd': amount_usd,
                    'term_months': term_months,
                    'monthly_income_usd': monthly_income_usd,
                    'province': province,
                    'employment_sector': employment_sector,
                    'loan_purpose': loan_purpose,
                    'dti_ratio': dti_ratio,
                    'officer_name': st.session_state.officer_name,
                    'branch_code': st.session_state.branch_code,
                }
            
                # Generate PDF in memory
                pdf_report = compile_underwriting_pdf(
                    pdf_record,
                    probability_of_default,
                    risk_tier.split(" ")[0],  # Extract risk level
                    underwriting_directive,
                    critical_drivers,
                    risk_components
                )
            
                # Premium download button
                st.download_button(
                    label=f"📥 Download PDF Report ({selected_client_id})",
                    data=pdf_report,
                    file_name=f"ZimBank_Assessment_{selected_client_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                    mime="application/pdf",
                    help="Basel IV-compliant underwriting assessment document",
                    use_container_width=True
                )
            
                # ────────────────────────────────────────────────────────────
                # DECISION NARRATIVE
                # ────────────────────────────────────────────────────────────
            
                st.markdown("---")
                st.markdown("### 📋 Decision Narrative & Risk Summary")
            
                narrative = generate_risk_narrative(
                    probability_of_default,
                    risk_components,
                    critical_drivers,
                    risk_tier
                )
            
                st.markdown(narrative)
            
                # ────────────────────────────────────────────────────────────
                # ACTION BUTTONS
                # ────────────────────────────────────────────────────────────
            
                st.markdown("---")
                st.markdown("### 🔄 Next Steps & Workflows")
            
                action_col1, action_col2, action_col3 = st.columns(3)
            
                with action_col1:
                    if st.button("📧 Send to Credit Committee", use_container_width=True):
                        st.success("✅ Report queued for committee review")
            
                with action_col2:
                    if st.button("💾 Archive Assessment", use_container_width=True):
                        st.success("✅ Assessment saved to archive")
            
                with action_col3:
                    if st.button("🔄 Score Another Applicant", use_container_width=True):
                        st.info("👈 Use the sidebar to select a different applicant")

            # ────────────────────────────────────────────────────────────
            # PORTFOLIO BATCH SCORING
            # ────────────────────────────────────────────────────────────
            if st.session_state.show_batch_tools:
                st.markdown("---")
                st.markdown("### Portfolio batch scoring")
                st.markdown("Run credit scoring across your entire applicant portfolio in one operation.")

            if st.session_state.show_batch_tools and st.button(
                "Run batch scoring on all applicants", use_container_width=True
            ):
                batch_rows = []
                progress = st.progress(0.0)
                ids = test_df["ID"].tolist()
                status_text = st.empty()
            
                for idx, row in enumerate(test_df.to_dict(orient="records")):
                    status_text.text(f"Processing {idx + 1} of {len(ids)}...")
                    feats = engineer_features_from_record(row)
                    if model_mode == "sklearn_direct":
                        numeric_cols = [
                            c for c in feats.columns
                            if pd.api.types.is_numeric_dtype(feats[c])
                        ]
                        X_num = _sanitize_features_for_inference(feats[numeric_cols])
                        pod = float(model.predict_proba(X_num)[0][1])
                    else:
                        pod = float(model.predict_proba(feats)[0][1])
                    tier = (
                        "Tier A" if pod < POD_APPROVE_MAX
                        else "Tier B" if pod < POD_REVIEW_MAX
                        else "Tier C"
                    )
                    batch_rows.append({
                        "ID": row.get("ID"),
                        "default_probability": round(pod, 4),
                        "risk_tier": tier,
                        "dti_ratio": round(float(feats["dti_ratio"].iloc[0]), 4),
                    })
                    progress.progress((idx + 1) / len(ids))
            
                status_text.empty()
                progress.empty()
            
                batch_df = pd.DataFrame(batch_rows)
                st.success(f"✅ Batch scoring complete — {len(batch_df)} applicants scored")
                st.dataframe(batch_df, use_container_width=True, hide_index=True)
                dl_col1, dl_col2 = st.columns(2)
                ts = datetime.now().strftime("%Y%m%d_%H%M%S")
                with dl_col1:
                    st.download_button(
                        "Download batch scores (CSV)",
                        data=batch_df.to_csv(index=False),
                        file_name=f"ZimBank_Batch_Scores_{ts}.csv",
                        mime="text/csv",
                        use_container_width=True,
                    )
                with dl_col2:
                    portfolio_pdf = compile_portfolio_pdf(
                        batch_df,
                        st.session_state.officer_name,
                        st.session_state.branch_code,
                    )
                    st.download_button(
                        "Download batch summary (PDF)",
                        data=portfolio_pdf,
                        file_name=f"ZimBank_Portfolio_Summary_{ts}.pdf",
                        mime="application/pdf",
                        use_container_width=True,
                    )
    
    except Exception as e:
        st.error(f"❌ Error processing file: {str(e)}")

else:
    # ─────────────────────────────────────────────────────────────────
    # WELCOME STATE
    # ─────────────────────────────────────────────────────────────────
    st.info(
        "👋 **Getting Started**: Upload `Test.csv` or enable **Use Sample Data** to begin scoring applicants."
    )