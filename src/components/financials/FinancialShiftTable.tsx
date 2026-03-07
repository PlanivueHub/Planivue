import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Table2 } from 'lucide-react';
import { calculateFinancials } from '@/lib/financial-engine';
import type { OvertimeConfig, PremiumConfig, BreakConfig } from '@/types/financials';
import { cn } from '@/lib/utils';

interface Props {
  employerCostPct: number;
  overtime: OvertimeConfig;
  premiums: PremiumConfig;
  breaks: BreakConfig;
}

// Sample shift data — replace with real DB queries when available
const SAMPLE_SHIFTS = [
  { id: '1', employee: 'Alice Tremblay', contract: 'Maintenance Bureau A', hourlyRate: 22, billingRate: 38, hours: 8, evening: 0, night: 0, weekend: 0, holiday: 0 },
  { id: '2', employee: 'Bob Lavoie', contract: 'Nettoyage Industriel', hourlyRate: 20, billingRate: 35, hours: 10, evening: 2, night: 0, weekend: 0, holiday: 0 },
  { id: '3', employee: 'Claire Morin', contract: 'Maintenance Bureau A', hourlyRate: 25, billingRate: 38, hours: 8, evening: 0, night: 4, weekend: 0, holiday: 0 },
  { id: '4', employee: 'David Gagnon', contract: 'Sécurité Entrepôt', hourlyRate: 19, billingRate: 42, hours: 12, evening: 0, night: 0, weekend: 8, holiday: 0 },
  { id: '5', employee: 'Emma Bouchard', contract: 'Nettoyage Industriel', hourlyRate: 21, billingRate: 35, hours: 6, evening: 0, night: 0, weekend: 0, holiday: 0 },
  { id: '6', employee: 'François Roy', contract: 'Sécurité Entrepôt', hourlyRate: 24, billingRate: 42, hours: 10, evening: 4, night: 0, weekend: 0, holiday: 0 },
  { id: '7', employee: 'Gabrielle Côté', contract: 'Maintenance Bureau A', hourlyRate: 18, billingRate: 38, hours: 8, evening: 0, night: 0, weekend: 0, holiday: 8 },
  { id: '8', employee: 'Hugo Pelletier', contract: 'Nettoyage Industriel', hourlyRate: 23, billingRate: 35, hours: 9, evening: 0, night: 3, weekend: 0, holiday: 0 },
];

const FinancialShiftTable = ({ employerCostPct, overtime, premiums, breaks }: Props) => {
  const { t, language } = useLanguage();

  const fmt = (v: number) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency', currency: 'CAD', minimumFractionDigits: 2,
    }).format(v);

  const rows = useMemo(() => SAMPLE_SHIFTS.map((s) => {
    const result = calculateFinancials({
      totalHours: s.hours, hourlyRate: s.hourlyRate, billingRate: s.billingRate,
      employerCostPct, overtime, premiums, breaks,
      eveningHours: s.evening, nightHours: s.night, weekendHours: s.weekend, holidayHours: s.holiday,
    });
    return { ...s, ...result };
  }), [employerCostPct, overtime, premiums, breaks]);

  const marginBadge = (m: number) => {
    if (m >= 25) return <Badge className="bg-success/15 text-success border-success/30 text-[10px]">{m.toFixed(1)}%</Badge>;
    if (m >= 10) return <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">{m.toFixed(1)}%</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">{m.toFixed(1)}%</Badge>;
  };

  // Totals
  const totals = rows.reduce((acc, r) => ({
    total_cost: acc.total_cost + r.total_cost,
    revenue: acc.revenue + r.revenue,
    profit: acc.profit + r.profit,
  }), { total_cost: 0, revenue: 0, profit: 0 });
  const totalMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Table2 className="h-4 w-4 text-primary" />
          {t('fin.shift_financials')}
        </CardTitle>
        <CardDescription>{t('fin.shift_financials_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">{t('shift.employee')}</TableHead>
                <TableHead className="text-xs">{t('fin.contract')}</TableHead>
                <TableHead className="text-xs text-right">{t('fin.hours_label')}</TableHead>
                <TableHead className="text-xs text-right">{t('fin.wage_rate')}</TableHead>
                <TableHead className="text-xs text-right">{t('fin.bill_rate')}</TableHead>
                <TableHead className="text-xs text-right">{t('fin.total_cost')}</TableHead>
                <TableHead className="text-xs text-right">{t('fin.revenue')}</TableHead>
                <TableHead className="text-xs text-right">{t('fin.profit')}</TableHead>
                <TableHead className="text-xs text-center">{t('fin.margin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className={cn(r.margin < 10 && 'bg-destructive/5')}>
                  <TableCell className="text-sm font-medium">{r.employee}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.contract}</TableCell>
                  <TableCell className="text-sm text-right">{r.hours}h</TableCell>
                  <TableCell className="text-sm text-right">{fmt(r.hourlyRate)}</TableCell>
                  <TableCell className="text-sm text-right">{fmt(r.billingRate)}</TableCell>
                  <TableCell className="text-sm text-right font-medium">{fmt(r.total_cost)}</TableCell>
                  <TableCell className="text-sm text-right">{fmt(r.revenue)}</TableCell>
                  <TableCell className={cn('text-sm text-right font-semibold', r.profit >= 0 ? 'text-success' : 'text-destructive')}>
                    {fmt(r.profit)}
                  </TableCell>
                  <TableCell className="text-center">{marginBadge(r.margin)}</TableCell>
                </TableRow>
              ))}
              {/* Totals row */}
              <TableRow className="border-t-2 border-border font-bold">
                <TableCell colSpan={5} className="text-sm">{t('fin.totals')}</TableCell>
                <TableCell className="text-sm text-right">{fmt(totals.total_cost)}</TableCell>
                <TableCell className="text-sm text-right">{fmt(totals.revenue)}</TableCell>
                <TableCell className={cn('text-sm text-right', totals.profit >= 0 ? 'text-success' : 'text-destructive')}>
                  {fmt(totals.profit)}
                </TableCell>
                <TableCell className="text-center">{marginBadge(totalMargin)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialShiftTable;
