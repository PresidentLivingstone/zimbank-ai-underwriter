# ZimBank AI Underwriter — project layout

This document describes where runtime files live and how the Streamlit app resolves paths.

## Directory map

| Path | Purpose |
|------|---------|
| **`assets/`** | Branding and UI images (not secrets). |
| `assets/zimbank_logo.png` | Sidebar logo, favicon, and PDF header when present. |
| `assets/login2.png` | Pre-login hero / marketing art on the welcome column. |
| **`models/`** | Serialized ML artifacts (`joblib`). |
| `models/final_credit_risk_model.joblib` | Primary production artifact (meta-learner, pipeline, or bundle dict). |
| `models/credit_risk_stack.joblib` | Optional full stacking bundle (CatBoost + XGBoost + RF + meta). If missing, the app falls back to `final_credit_risk_model.joblib` or simulation mode. |
| **`data/`** | Bundled or reference datasets shipped with the repo. |
| `data/sample_test_data.csv` | Demo ledger used when **Use Sample Data** is enabled. |
| **`zimbank_app.py`** | Application entrypoint; defines `APP_DIR` and joins the paths above. |
| **`.streamlit/`** | `config.toml` and optional `secrets.toml` (not committed) for staff auth overrides. |

Optional files at the **repository root** (unchanged):

- `Test.csv` — if present, the “Use Sample Data” checkbox defaults may treat it as an alternative local ledger (see app logic).
- `zimbank_auth.db` — SQLite auth store created at runtime when using packaged auth flows.

## Path constants (code)

All paths are derived from `APP_DIR = dirname(zimbank_app.py)`:

- `ASSETS_DIR` → `assets`
- `MODELS_DIR` → `models`
- `DATA_DIR` → `data`

If you add a new logo or hero image, drop it under **`assets/`** and keep the filenames above, or change the constants at the top of `zimbank_app.py`.

## Run

```bash
pip install -r requirements.txt
streamlit run zimbank_app.py
```

## Auth

Staff sign-in can be overridden with Streamlit secrets (recommended for production). See Streamlit docs for `[auth]` / `users` maps in `secrets.toml`. Do not commit real passwords.

## ML modes (load order)

1. If `models/credit_risk_stack.joblib` loads successfully → full stacking path.  
2. Else if `models/final_credit_risk_model.joblib` loads → meta-only, sklearn direct, or embedded dict bundle depending on artifact shape.  
3. Else → built-in **simulation** scorer (no joblib required).

## Data hygiene

Uploaded CSVs may contain blanks; the app coerces missing numerics and categoricals before scoring so sklearn meta-learners do not receive NaNs. Prefer explicit missing-value policy in your source ledger and documentation for auditors.

## Large media (GitHub limit)

GitHub rejects files **over 100 MB**. Do not commit raw `.mov` / `.mp4` bundles; use **Git LFS**, **Releases**, or cloud storage and link from the README instead.
