import { useMemo, useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Table2, Loader2, AlertCircle } from 'lucide-react';
import { calculateFinancials } from '@/lib/financial-engine';
import type { OvertimeConfig, PremiumConfig, BreakConfig } from '@/types/financials';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  employerCostPct: number;
  overtime: OvertimeConfig;
  premiums: PremiumConfig;
  breaks: BreakConfig;
}

interface ShiftRow {
  id: string;
  employee: string;
  contract: string;
  hourlyRate: number;
  billingRate: number;
  hours: number;
  evening: number;
  night: number;
  weekend: number;
  holiday: number;
}

function classifyHours(startDatetime: string, endDatetime: string) {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const totalHours = (end.getTime() - start.getTime()) / 3600000;

  let evening = 0, night = 0, weekend = 0;

  // Walk hour-by-hour for classification
  const cursor = new Date(start);
  while (cursor < end) {
    const nextHour = new Date(Math.min(cursor.getTime() + 3600000, end.getTime()));
    const fraction = (nextHour.getTime() - cursor.getTime()) / 3600000;
    const hour = cursor.getHours();
    const day = cursor.getDay(); // 0=Sun, 6=Sat

    if (day === 0 || day === 6) {
      weekend += fraction;
    } else if (hour >= 18 && hour < 23) {
      evening += fraction;
    } else if (hour >= 23 || hour < 6) {
      night += fraction;
    }

    cursor.setTime(nextHour.getTime());
  }

  return { totalHours: Math.max(0, totalHours), evening, night, weekend, holiday: 0 };
}

const FinancialShiftTable = ({ employerCostPct, overtime, premiums, breaks }: Props) => {
  const { t, language } = useLanguage();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);

      // Fetch shifts with assignments, employee details, profiles, and contracts
      const { data: shiftData, error: shiftErr } = await supabase
        .from('shifts')
        .select(`
          id, start_datetime, end_datetime, label,
          contract_id,
          contracts ( title, client_name, billing_rate ),
          shift_assignments (
            user_id,
            hourly_rate_snapshot,
            status
          )
        `)
        .order('start_datetime', { ascending: false })
        .limit(100);

      if (shiftErr) {
        setError(shiftErr.message);
        setLoading(false);
        return;
      }

      if (!shiftData || shiftData.length === 0) {
        setShifts([]);
        setLoading(false);
        return;
      }

      // Collect unique user_ids to fetch names and hourly rates
      const userIds = new Set<string>();
      for (const s of shiftData) {
        const assignments = s.shift_assignments as any[];
        if (assignments) {
          for (const a of assignments) {
            if (a.status !== 'cancelled') userIds.add(a.user_id);
          }
        }
      }

      const userIdArr = Array.from(userIds);

      // Parallel fetch profiles and employee_details
      const [profilesRes, detailsRes] = await Promise.all([
        userIdArr.length > 0
          ? supabase.from('profiles').select('id, full_name').in('id', userIdArr)
          : Promise.resolve({ data: [], error: null }),
        userIdArr.length > 0
          ? supabase.from('employee_details').select('user_id, hourly_rate').in('user_id', userIdArr)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const nameMap = new Map<string, string>();
      for (const p of (profilesRes.data || [])) {
        nameMap.set(p.id, p.full_name || p.id.slice(0, 8));
      }

      const rateMap = new Map<string, number>();
      for (const d of (detailsRes.data || [])) {
        rateMap.set(d.user_id, Number(d.hourly_rate));
      }

      // Build rows: one per assignment (shift × employee)
      const rows: ShiftRow[] = [];
      for (const s of shiftData) {
        const contract = s.contracts as any;
        const contractName = contract ? `${contract.title || contract.client_name}` : '—';
        const billingRate = contract?.billing_rate ? Number(contract.billing_rate) : 0;
        const assignments = (s.shift_assignments as any[]) || [];
        const classified = classifyHours(s.start_datetime, s.end_datetime);

        for (const a of assignments) {
          if (a.status === 'cancelled') continue;
          const hourlyRate = a.hourly_rate_snapshot
            ? Number(a.hourly_rate_snapshot)
            : (rateMap.get(a.user_id) || 0);

          rows.push({
            id: `${s.id}-${a.user_id}`,
            employee: nameMap.get(a.user_id) || a.user_id.slice(0, 8),
            contract: contractName,
            hourlyRate,
            billingRate,
            hours: classified.totalHours,
            evening: classified.evening,
            night: classified.night,
            weekend: classified.weekend,
            holiday: classified.holiday,
          });
        }

        // If no assignments, still show the shift
        if (assignments.length === 0 || assignments.every((a: any) => a.status === 'cancelled')) {
          rows.push({
            id: s.id,
            employee: '—',
            contract: contractName,
            hourlyRate: 0,
            billingRate,
            hours: classified.totalHours,
            evening: classified.evening,
            night: classified.night,
            weekend: classified.weekend,
            holiday: classified.holiday,
          });
        }
      }

      setShifts(rows);
      setLoading(false);
    })();
  }, []);

  const fmt = (v: number) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency', currency: 'CAD', minimumFractionDigits: 2,
    }).format(v);

  const calculated = useMemo(() => shifts.map((s) => {
    const result = calculateFinancials({
      totalHours: s.hours, hourlyRate: s.hourlyRate, billingRate: s.billingRate,
      employerCostPct, overtime, premiums, breaks,
      eveningHours: s.evening, nightHours: s.night, weekendHours: s.weekend, holidayHours: s.holiday,
    });
    return { ...s, ...result };
  }), [shifts, employerCostPct, overtime, premiums, breaks]);

  const marginBadge = (m: number) => {
    if (m >= 25) return <Badge className="bg-success/15 text-success border-success/30 text-[10px]">{m.toFixed(1)}%</Badge>;
    if (m >= 10) return <Badge className="bg-warning/15 text-warning border-warning/30 text-[10px]">{m.toFixed(1)}%</Badge>;
    return <Badge className="bg-destructive/15 text-destructive border-destructive/30 text-[10px]">{m.toFixed(1)}%</Badge>;
  };

  const totals = calculated.reduce((acc, r) => ({
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
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive py-6 justify-center">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        ) : calculated.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            {t('fin.no_shifts')}
          </p>
        ) : (
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
                {calculated.map((r) => (
                  <TableRow key={r.id} className={cn(r.margin < 10 && 'bg-destructive/5')}>
                    <TableCell className="text-sm font-medium">{r.employee}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.contract}</TableCell>
                    <TableCell className="text-sm text-right">{r.hours.toFixed(1)}h</TableCell>
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
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialShiftTable;
