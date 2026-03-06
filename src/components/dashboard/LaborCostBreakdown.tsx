import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign } from 'lucide-react';

// Sample data — replace with real labor cost queries when available
const SAMPLE_DATA = [
  { month: 'Jan', regular: 12400, overtime: 1800, benefits: 3200, profit: 4600 },
  { month: 'Feb', regular: 13100, overtime: 2200, benefits: 3400, profit: 5100 },
  { month: 'Mar', regular: 11800, overtime: 1400, benefits: 3100, profit: 4200 },
  { month: 'Apr', regular: 14200, overtime: 2800, benefits: 3600, profit: 5800 },
  { month: 'May', regular: 13600, overtime: 2100, benefits: 3300, profit: 5400 },
  { month: 'Jun', regular: 15000, overtime: 3200, benefits: 3800, profit: 6200 },
];

const CHART_TOKENS = {
  regular: 'hsl(var(--chart-primary))',
  overtime: 'hsl(var(--chart-overtime))',
  benefits: 'hsl(var(--chart-benefits))',
  profit: 'hsl(var(--chart-profit))',
};

const LaborCostBreakdown = () => {
  const { t, language } = useLanguage();

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(v);

  const totals = SAMPLE_DATA.reduce(
    (acc, row) => ({
      regular: acc.regular + row.regular,
      overtime: acc.overtime + row.overtime,
      benefits: acc.benefits + row.benefits,
      profit: acc.profit + row.profit,
    }),
    { regular: 0, overtime: 0, benefits: 0, profit: 0 }
  );

  const legendItems = [
    { key: 'regular', label: t('dashboard.regular_hours'), color: CHART_TOKENS.regular, total: totals.regular },
    { key: 'overtime', label: t('dashboard.overtime'), color: CHART_TOKENS.overtime, total: totals.overtime },
    { key: 'benefits', label: t('dashboard.benefits'), color: CHART_TOKENS.benefits, total: totals.benefits },
    { key: 'profit', label: t('dashboard.profit'), color: CHART_TOKENS.profit, total: totals.profit },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          {t('dashboard.labor_cost_breakdown')}
        </CardTitle>
        <CardDescription>{t('dashboard.labor_cost_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          {/* Stacked Bar Chart */}
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={SAMPLE_DATA} barSize={28}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    regular: t('dashboard.regular_hours'),
                    overtime: t('dashboard.overtime'),
                    benefits: t('dashboard.benefits'),
                    profit: t('dashboard.profit'),
                  };
                  return [formatCurrency(value), labels[name] || name];
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
              <Bar dataKey="regular" stackId="cost" fill={CHART_TOKENS.regular} radius={[0, 0, 0, 0]} />
              <Bar dataKey="overtime" stackId="cost" fill={CHART_TOKENS.overtime} radius={[0, 0, 0, 0]} />
              <Bar dataKey="benefits" stackId="cost" fill={CHART_TOKENS.benefits} radius={[0, 0, 0, 0]} />
              <Bar dataKey="profit" stackId="cost" fill={CHART_TOKENS.profit} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Legend with totals */}
          <div className="flex flex-row gap-4 lg:flex-col lg:justify-center lg:gap-3">
            {legendItems.map((item) => (
              <div key={item.key} className="flex items-center gap-2.5">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                  <p className="text-sm font-semibold">{formatCurrency(item.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LaborCostBreakdown;
