import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CalendarDays, Clock, TrendingUp, Timer } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Shift, ShiftAssignment } from '@/types/database';

const STANDARD_HOURS = 8;

const WeeklyHoursOverview = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'fr' ? frLocale : enCA;
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  useEffect(() => {
    const fetchShifts = async () => {
      if (!user) return;
      setLoading(true);

      // Get assignments for this user
      const { data: assignData } = await supabase
        .from('shift_assignments')
        .select('shift_id')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

      if (!assignData || assignData.length === 0) {
        setShifts([]);
        setLoading(false);
        return;
      }

      const shiftIds = (assignData as Pick<ShiftAssignment, 'shift_id'>[]).map((a) => a.shift_id);

      const { data } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds)
        .gte('start_datetime', currentWeekStart.toISOString())
        .lte('start_datetime', currentWeekEnd.toISOString())
        .order('start_datetime', { ascending: true });

      setShifts((data as Shift[]) ?? []);
      setLoading(false);
    };

    fetchShifts();
  }, [user, weekOffset]);

  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const chartData = useMemo(() => {
    return weekDays.map((day) => {
      const dayShifts = shifts.filter((s) => isSameDay(new Date(s.start_datetime), day));
      const totalHours = dayShifts.reduce((sum, s) => {
        const dur = (new Date(s.end_datetime).getTime() - new Date(s.start_datetime).getTime()) / 3600000;
        return sum + dur;
      }, 0);
      const regular = Math.min(totalHours, STANDARD_HOURS);
      const overtime = Math.max(0, totalHours - STANDARD_HOURS);
      const isToday = isSameDay(day, new Date());

      return {
        day: format(day, 'EEE', { locale: dateLocale }),
        date: format(day, 'd MMM', { locale: dateLocale }),
        regular: parseFloat(regular.toFixed(1)),
        overtime: parseFloat(overtime.toFixed(1)),
        total: parseFloat(totalHours.toFixed(1)),
        isToday,
      };
    });
  }, [shifts, weekDays, dateLocale]);

  const weekTotals = useMemo(() => {
    const total = chartData.reduce((s, d) => s + d.total, 0);
    const regular = chartData.reduce((s, d) => s + d.regular, 0);
    const overtime = chartData.reduce((s, d) => s + d.overtime, 0);
    const daysWorked = chartData.filter((d) => d.total > 0).length;
    return { total, regular, overtime, daysWorked };
  }, [chartData]);

  const weekLabel = `${format(currentWeekStart, 'd MMM', { locale: dateLocale })} – ${format(currentWeekEnd, 'd MMM yyyy', { locale: dateLocale })}`;

  const summaryCards = [
    { icon: Clock, label: t('emp.total_hours'), value: `${weekTotals.total.toFixed(1)}h`, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Timer, label: t('emp.regular_hours'), value: `${weekTotals.regular.toFixed(1)}h`, color: 'text-chart-primary', bg: 'bg-chart-primary/10' },
    { icon: TrendingUp, label: t('emp.overtime_hours'), value: `${weekTotals.overtime.toFixed(1)}h`, color: 'text-chart-overtime', bg: 'bg-chart-overtime/10' },
    { icon: CalendarDays, label: t('emp.days_worked'), value: `${weekTotals.daysWorked}/7`, color: 'text-chart-benefits', bg: 'bg-chart-benefits/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bg}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="font-display text-xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              {t('emp.weekly_hours')}
            </CardTitle>
            <CardDescription>{weekLabel}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
              {t('emp.this_week')}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset >= 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barSize={32}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} tickFormatter={(v) => `${v}h`} domain={[0, 'auto']} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = { regular: t('emp.regular_hours'), overtime: t('emp.overtime_hours') };
                      return [`${value}h`, labels[name] || name];
                    }}
                    labelFormatter={(label: string, payload: any[]) => payload?.[0]?.payload?.date ?? label}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                  />
                  <ReferenceLine y={STANDARD_HOURS} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
                  <Bar dataKey="regular" stackId="hours" fill="hsl(var(--chart-primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overtime" stackId="hours" fill="hsl(var(--chart-overtime))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-chart-primary" />
                  <span className="text-muted-foreground">{t('emp.regular_hours')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-sm bg-chart-overtime" />
                  <span className="text-muted-foreground">{t('emp.overtime_hours')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-px w-6 border-t-2 border-dashed border-muted-foreground/50" />
                  <span className="text-muted-foreground">{t('emp.standard_day')} ({STANDARD_HOURS}h)</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WeeklyHoursOverview;
