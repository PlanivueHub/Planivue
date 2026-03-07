export interface EmployerCostPercents {
  rrq: number;
  rqap: number;
  cnesst: number;
  fs: number;
  ei: number;
  cpp: number;
  wsib: number;
  eht: number;
  vacation_pay: number;
}

export interface OvertimeConfig {
  threshold_hours: number;
  multiplier: number;
}

export interface PremiumConfig {
  evening: number;
  night: number;
  weekend: number;
  holiday: number;
}

export interface BreakConfig {
  paid: boolean;
  duration_minutes: number;
  threshold_hours: number;
}

export interface FinancialResult {
  regular_hours: number;
  overtime_hours: number;
  regular_cost: number;
  overtime_cost: number;
  premium_cost: number;
  gross_wage: number;
  employer_cost: number;
  total_cost: number;
  revenue: number;
  profit: number;
  margin: number;
  break_deduction_hours: number;
}
