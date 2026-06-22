
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id text UNIQUE NOT NULL,
  full_name text NOT NULL,
  client_dob date NOT NULL,
  province text NOT NULL,
  employment_sector text NOT NULL,
  months_at_employer integer NOT NULL DEFAULT 0,
  monthly_income_usd numeric NOT NULL,
  existing_obligations integer NOT NULL DEFAULT 0,
  num_dependents integer NOT NULL DEFAULT 0,
  amount_usd numeric NOT NULL,
  annual_rate_pct numeric NOT NULL,
  term_months integer NOT NULL,
  loan_purpose text NOT NULL,
  product_code text NOT NULL,
  -- computed fields stored for display
  dti_ratio numeric,
  monthly_installment numeric,
  total_to_income numeric,
  work_stability numeric,
  -- risk scoring outputs
  default_probability numeric,
  risk_tier text,
  underwriting_status text,
  dti_burden_score numeric,
  employment_stability_score numeric,
  existing_leverage_score numeric,
  life_stage_score numeric,
  loan_to_income_score numeric,
  -- flags
  flag_high_dti boolean DEFAULT false,
  flag_tenure_instability boolean DEFAULT false,
  flag_credit_leverage boolean DEFAULT false,
  flag_demographic_burden boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_all_customers" ON customers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "insert_all_customers" ON customers FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "update_all_customers" ON customers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_all_customers" ON customers FOR DELETE TO anon, authenticated USING (true);
