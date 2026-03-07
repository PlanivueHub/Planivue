import { useState, useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3, ArrowRight } from 'lucide-react';
import { calculateFinancials } from '@/lib/financial-engine';
import type { OvertimeConfig, PremiumConfig, BreakConfig } from '@/types/financials';
import { cn } from '@/lib/utils';

interface Props {
  employerCostPct: number;
  overtime: OvertimeConfig;
  premiums: PremiumConfig;
}

const SCENARIO_HOURS = [35.7, 40];

const ComparativeAnalysis = ({ employerCostPct, overtime, premiums }: Props) => {
  const { t, language } = useLanguage();

  const [hourlyRate, setHourlyRate] = useState(22);
  const [billingRate, setBillingRate] = useState(38);

  const noBreaks: BreakConfig = { paid: true, duration_minutes: 0, threshold_hours: 99 };

  const scenarios = useMemo(() => SCENARIO_HOURS.map((hours) => {
    const result = calculateFinancials({
      totalHours: hours, hourlyRate, billingRate, employerCostPct,
      overtime, premiums, breaks: noBreaks,
    });
    return { hours, ...result };
  }), [hourlyRate, billingRate, employerCostPct, overtime, premiums]);

  const fmt = (v: number) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency', currency: 'CAD', minimumFractionDigits: 2,
    }).format(v);

  const diff = {
    total_cost: scenarios[1].total_cost - scenarios[0].total_cost,
    revenue: scenarios[1].revenue - scenarios[0].revenue,
    profit: scenarios[1].profit - scenarios[0].profit,
    overtime_cost: scenarios[1].overtime_cost - scenarios[0].overtime_cost,
  };

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t('fin.comparative_title')}
          </CardTitle>
          <CardDescription>{t('fin.comparative_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="space-y-1">
              <Label className="text-xs">{t('fin.hourly_rate')}</Label>
              <div className="relative">
                <Input type="number" step="0.5" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(+e.target.value)} className="w-[120px] pl-6" />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('fin.billing_rate')}</Label>
              <div className="relative">
                <Input type="number" step="0.5" min="0" value={billingRate} onChange={(e) => setBillingRate(+e.target.value)} className="w-[120px] pl-6" />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-side scenarios */}
      <div className="grid gap-4 lg:grid-cols-3">
        {scenarios.map((s, i) => {
          const marginColor = s.margin >= 25 ? 'text-success' : s.margin >= 10 ? 'text-warning' : 'text-destructive';
          return (
            <Card key={s.hours} className={cn('border-border/50', i === 1 && s.overtime_hours > 0 && 'ring-1 ring-warning/40')}>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-sm flex items-center gap-2">
                  {s.hours}h / {t('fin.week')}
                  {i === 1 && s.overtime_hours > 0 && (
                    <Badge variant="outline" className="text-warning border-warning/30 text-[10px]">
                      {t('fin.has_overtime')}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <MetricRow label={t('fin.regular')} value={`${s.regular_hours.toFixed(1)}h`} />
                <MetricRow label={t('fin.overtime')} value={`${s.overtime_hours.toFixed(1)}h`} highlight={s.overtime_hours > 0} />
                <MetricRow label={t('fin.gross_wage')} value={fmt(s.gross_wage)} />
                <MetricRow label={t('fin.total_cost')} value={fmt(s.total_cost)} bold />
                <MetricRow label={t('fin.revenue')} value={fmt(s.revenue)} />
                <div className="pt-2 border-t border-border/50">
                  <MetricRow label={t('fin.profit')} value={fmt(s.profit)} bold color={s.profit >= 0 ? 'text-success' : 'text-destructive'} />
                  <MetricRow label={t('fin.margin')} value={`${s.margin.toFixed(1)}%`} bold color={marginColor} />
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Difference / Impact */}
        <Card className="border-border/50 bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              {t('fin.overtime_impact')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <MetricRow label={`Δ ${t('fin.overtime_cost')}`} value={fmt(diff.overtime_cost)} color="text-warning" />
            <MetricRow label={`Δ ${t('fin.total_cost')}`} value={fmt(diff.total_cost)} />
            <MetricRow label={`Δ ${t('fin.revenue')}`} value={fmt(diff.revenue)} color="text-success" />
            <div className="pt-2 border-t border-border/50">
              <MetricRow
                label={`Δ ${t('fin.profit')}`}
                value={fmt(diff.profit)}
                bold
                color={diff.profit >= 0 ? 'text-success' : 'text-destructive'}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MetricRow = ({ label, value, bold, highlight, color }: {
  label: string; value: string; bold?: boolean; highlight?: boolean; color?: string;
}) => (
  <div className={cn('flex justify-between', bold && 'font-semibold', highlight && 'text-warning')}>
    <span className="text-muted-foreground">{label}</span>
    <span className={color}>{value}</span>
  </div>
);

export default ComparativeAnalysis;
