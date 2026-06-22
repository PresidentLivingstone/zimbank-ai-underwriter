export interface CustomerInput {
  amount_usd: number;
  term_months: number;
  monthly_income_usd: number;
  months_at_employer: number;
  existing_obligations: number;
  num_dependents: number;
  client_dob: string;
}

export interface ScoringResult {
  monthly_installment: number;
  dti_ratio: number;
  total_to_income: number;
  work_stability: number;
  has_obligations: number;
  dti_burden_score: number;
  employment_stability_score: number;
  existing_leverage_score: number;
  life_stage_score: number;
  loan_to_income_score: number;
  default_probability: number;
  risk_tier: string;
  underwriting_status: string;
  flag_high_dti: boolean;
  flag_tenure_instability: boolean;
  flag_credit_leverage: boolean;
  flag_demographic_burden: boolean;
}

function getAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function scoreCustomer(input: CustomerInput): ScoringResult {
  const { amount_usd, term_months, monthly_income_usd, months_at_employer, existing_obligations, num_dependents, client_dob } = input;
  const age = getAge(client_dob);

  const monthly_installment = amount_usd / (term_months + 0.1);
  const dti_ratio = monthly_installment / monthly_income_usd;
  const total_to_income = amount_usd / monthly_income_usd;
  const work_stability = months_at_employer / (age * 12);
  const has_obligations = existing_obligations > 0 ? 1 : 0;

  // DTI burden score
  let dti_burden_score: number;
  if (dti_ratio < 0.20) dti_burden_score = 10;
  else if (dti_ratio < 0.35) dti_burden_score = 25;
  else if (dti_ratio < 0.50) dti_burden_score = 50;
  else dti_burden_score = Math.min(dti_ratio * 100, 95);

  // Employment stability score
  let employment_stability_score: number;
  if (months_at_employer < 6) employment_stability_score = 75;
  else if (months_at_employer < 12) employment_stability_score = 50;
  else if (months_at_employer < 24) employment_stability_score = 30;
  else employment_stability_score = 10;

  // Existing leverage score
  const existing_leverage_score = Math.min(existing_obligations * 20, 80);

  // Life stage score
  let life_stage_score: number;
  if (age < 25) life_stage_score = 45;
  else if (age < 35) life_stage_score = 25;
  else if (age < 60) life_stage_score = 15;
  else life_stage_score = 35;

  // Loan to income score
  const ltir = total_to_income;
  let loan_to_income_score: number;
  if (ltir < 0.10) loan_to_income_score = 10;
  else if (ltir < 0.20) loan_to_income_score = 25;
  else if (ltir < 0.35) loan_to_income_score = 45;
  else loan_to_income_score = Math.min(ltir * 100, 90);

  const avg_score = (dti_burden_score + employment_stability_score + existing_leverage_score + life_stage_score + loan_to_income_score) / 5;
  const default_probability = Math.min(avg_score / 100, 0.99);

  let risk_tier: string;
  let underwriting_status: string;
  if (default_probability < 0.35) {
    risk_tier = 'Low Risk (Tier A)';
    underwriting_status = 'AUTO-APPROVED';
  } else if (default_probability < 0.60) {
    risk_tier = 'Medium Risk (Tier B)';
    underwriting_status = 'CREDIT UNDERWRITER REVIEW';
  } else {
    risk_tier = 'High Risk (Tier C)';
    underwriting_status = 'SYSTEM HARD DECLINED';
  }

  return {
    monthly_installment,
    dti_ratio,
    total_to_income,
    work_stability,
    has_obligations,
    dti_burden_score,
    employment_stability_score,
    existing_leverage_score,
    life_stage_score,
    loan_to_income_score,
    default_probability,
    risk_tier,
    underwriting_status,
    flag_high_dti: dti_ratio > 0.42,
    flag_tenure_instability: months_at_employer < 12,
    flag_credit_leverage: existing_obligations > 2,
    flag_demographic_burden: num_dependents > 3,
  };
}
