# ZimBank AI Credit Risk Underwriting Platform

## Key Features

| Feature | Description |
|---------|-------------|
| **Real‑time Scoring** | Evaluate single applicants using a stacking / meta-learner or sklearn pipeline loaded from `models/`. |
| **Explainable AI** | Component risk scores (DTI, employment, leverage, age, loan‑to‑income) for narrative and committee use. |
| **Basel IV Reports** | PDF generation with metrics and audit-oriented copy. |
| **Batch Processing** | Score a full ledger and export CSV / portfolio PDF. |
| **Regional Focus** | Feature engineering and thresholds tuned for Southern Africa contexts. |

## Risk logic (example policy bands)

| Default probability | Risk tier | Decision |
|---------------------|-----------|----------|
| Under 35% | Low (A) | Approved (auto pathway) |
| 35% to 60% | Medium (B) | Under review |
| Over 60% | High (C) | Declined |


### Platform Capabilities
    
-  Real-Time Scoring: Instant credit risk assessment using ensemble machine learning
-  Explainable AI: Component-level risk breakdown for full transparency
-  Basel IV Compliance: Institutional-grade reporting for regulators
-  Regional Intelligence: Zimbabwe & Southern Africa lending insights
-  Decision Support: Automated approval/decline/review workflow
-  Audit Trail: Complete documentation for credit committee review

###  Use Cases

Perfect for:
- **Financial Institutions**: Automated lending decisions at scale
- **Fintech Platforms**: Risk assessment API integration
- **Credit Unions**: Fair, consistent decision-making
- **Policy Makers**: Financial inclusion data analysis & impact measurement


## Tech stack

- **UI** — Streamlit (institutional theme in `zimbank_app.py`)
- **ML** — scikit-learn, optional CatBoost / XGBoost (via joblib bundles)
- **PDF** — ReportLab
- **Data** — pandas, NumPy


## Quick start

```bash
git clone https://github.com/PresidentLivingstone/zimbank-ai-underwriter
cd zimbank-ai-underwriter

python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

pip install -r requirements.txt
streamlit run zimbank_app.py

Login Credentials
Demo access: analyst / ZimBank2026 || admin / Admin@2026

Innovative Solution Video Explanation.mov | https://drive.google.com/file/d/1-q8D8QSoEuaNftgX1SR1SIODz5wh4HBT/view?usp=sharing
```



