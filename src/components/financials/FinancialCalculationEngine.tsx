import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { calculateFinancials } from '@/lib/financial-engine';
import type { OvertimeConfig, PremiumConfig, BreakConfig } from '@/types/financials';
import { cn } from '@/lib/utils';

interface Props {
  employerCostPct: number;
  overtime: OvertimeConfig;
  premiums: PremiumConfig;
  breaks: BreakConfig;
}

const FinancialCalculationEngine = ({ employerCostPct, overtime, premiums, breaks }: Props) => {
  const { t, language } = useLanguage();

  const [hourlyRate, setHourlyRate] = useState(22);
  const [billingRate, setBillingRate] = useState(38);
  const [totalHours, setTotalHours] = useState(40);
  const [eveningHours, setEveningHours] = useState(0);
  const [nightHours, setNightHours] = useState(0);
  const [weekendHours, setWeekendHours] = useState(0);
  const [holidayHours, setHolidayHours] = useState(0);

  const result = useMemo(() => calculateFinancials({
    totalHours, hourlyRate, billingRate, employerCostPct,
    overtime, premiums, breaks,
    eveningHours, nightHours, weekendHours, holidayHours,
  }), [totalHours, hourlyRate, billingRate, employerCostPct, overtime, premiums, breaks, eveningHours, nightHours, weekendHours, holidayHours]);

  const fmt = (v: number) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency', currency: 'CAD', minimumFractionDigits: 2,
    }).format(v);

  const marginColor = result.margin >= 25 ? 'text-success' : result.margin >= 10 ? 'text-warning' : 'text-destructive';
  const profitColor = result.profit >= 0 ? 'text-success' : 'text-destructive';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* Inputs */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            {t('fin.calc_inputs')}
          </CardTitle>
          <CardDescription>{t('fin.calc_inputs_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">{t('fin.hourly_rate')}</Label>
              <div className="relative">
                <Input type="number" step="0.5" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(+e.target.value)} className="pl-6" />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('fin.billing_rate')}</Label>
              <div className="relative">
                <Input type="number" step="0.5" min="0" value={billingRate} onChange={(e) => setBillingRate(+e.target.value)} className="pl-6" />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('fin.total_hours')}</Label>
              <Input type="number" step="0.5" min="0" value={totalHours} onChange={(e) => setTotalHours(+e.target.value)} />
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('fin.premium_hours')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">{t('fin.evening_hours')}</Label>
                <Input type="number" min="0" value={eveningHours} onChange={(e) => setEveningHours(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('fin.night_hours')}</Label>
                <Input type="number" min="0" value={nightHours} onChange={(e) => setNightHours(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('fin.weekend_hours')}</Label>
                <Input type="number" min="0" value={weekendHours} onChange={(e) => setWeekendHours(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('fin.holiday_hours')}</Label>
                <Input type="number" min="0" value={holidayHours} onChange={(e) => setHolidayHours(+e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            {t('fin.calc_results')}
          </CardTitle>
          <CardDescription>{t('fin.calc_results_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Hours breakdown */}
          <div className="rounded-lg border border-border/50 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {t('fin.hours_breakdown')}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold">{result.regular_hours.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">{t('fin.regular')}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-warning">{result.overtime_hours.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">{t('fin.overtime')}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-muted-foreground">{result.break_deduction_hours.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">{t('fin.break_deductions')}</p>
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-1.5 text-sm">
            <Row label={t('fin.regular_cost')} value={fmt(result.regular_cost)} />
            <Row label={t('fin.overtime_cost')} value={fmt(result.overtime_cost)} highlight />
            <Row label={t('fin.premium_cost')} value={fmt(result.premium_cost)} />
            <Separator />
            <Row label={t('fin.gross_wage')} value={fmt(result.gross_wage)} bold />
            <Row label={`${t('fin.employer_charges')} (${employerCostPct.toFixed(1)}%)`} value={fmt(result.employer_cost)} />
            <Separator />
            <Row label={t('fin.total_cost')} value={fmt(result.total_cost)} bold />
            <Row label={t('fin.revenue')} value={fmt(result.revenue)} />
          </div>

          <Separator />

          {/* Profit & Margin */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
              <div className={cn('flex items-center justify-center gap-1', profitColor)}>
                {result.profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-xl font-bold">{fmt(result.profit)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{t('fin.profit')}</p>
            </div>
            <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
              <div className={cn('text-xl font-bold', marginColor)}>
                {result.margin.toFixed(1)}%
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{t('fin.margin')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Row = ({ label, value, bold, highlight }: { label: string; value: string; bold?: boolean; highlight?: boolean }) => (
  <div className={cn('flex justify-between', bold && 'font-semibold', highlight && 'text-warning')}>
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

export default FinancialCalculationEngine;
