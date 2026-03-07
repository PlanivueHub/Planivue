import type { OvertimeConfig, PremiumConfig, BreakConfig, FinancialResult } from '@/types/financials';

interface CalcInput {
  totalHours: number;
  hourlyRate: number;
  billingRate: number;
  employerCostPct: number;
  overtime: OvertimeConfig;
  premiums: PremiumConfig;
  breaks: BreakConfig;
  eveningHours?: number;
  nightHours?: number;
  weekendHours?: number;
  holidayHours?: number;
}

export function calculateFinancials(input: CalcInput): FinancialResult {
  const {
    totalHours, hourlyRate, billingRate, employerCostPct,
    overtime, premiums, breaks,
    eveningHours = 0, nightHours = 0, weekendHours = 0, holidayHours = 0,
  } = input;

  // Break deductions
  let effectiveHours = totalHours;
  let breakDeduction = 0;
  if (!breaks.paid && totalHours >= breaks.threshold_hours) {
    const breakSessions = Math.floor(totalHours / breaks.threshold_hours);
    breakDeduction = (breakSessions * breaks.duration_minutes) / 60;
    effectiveHours = totalHours - breakDeduction;
  }

  // Regular vs overtime split
  const regularHours = Math.min(effectiveHours, overtime.threshold_hours);
  const overtimeHours = Math.max(0, effectiveHours - overtime.threshold_hours);

  // Base wage
  const regularCost = regularHours * hourlyRate;
  const overtimeCost = overtimeHours * hourlyRate * overtime.multiplier;

  // Premiums (flat $/hr additions)
  const premiumCost =
    eveningHours * premiums.evening +
    nightHours * premiums.night +
    weekendHours * premiums.weekend +
    holidayHours * premiums.holiday;

  const grossWage = regularCost + overtimeCost + premiumCost;

  // Employer cost = grossWage × (1 + employer_cost_percentage / 100)
  const employerCostMultiplier = 1 + employerCostPct / 100;
  const totalCost = grossWage * employerCostMultiplier;
  const employerCost = totalCost - grossWage;

  // Revenue = billable hours × billing rate
  const revenue = effectiveHours * billingRate;

  // Profit & margin
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    regular_hours: regularHours,
    overtime_hours: overtimeHours,
    regular_cost: regularCost,
    overtime_cost: overtimeCost,
    premium_cost: premiumCost,
    gross_wage: grossWage,
    employer_cost: employerCost,
    total_cost: totalCost,
    revenue,
    profit,
    margin,
    break_deduction_hours: breakDeduction,
  };
}
