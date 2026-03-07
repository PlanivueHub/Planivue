import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, FileText } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isFuture, startOfDay } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { Shift, ShiftAssignment, ScheduleWeek } from '@/types/database';

interface EnrichedShift {
  shift: Shift;
  assignment: ShiftAssignment;
  week_status: string;
}

const MySchedulePage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [enrichedShifts, setEnrichedShifts] = useState<EnrichedShift[]>([]);
  const [loading, setLoading] = useState(true);
  const dateLocale = language === 'fr' ? frLocale : enCA;

  useEffect(() => {
    const fetchShifts = async () => {
      if (!user) return;
      setLoading(true);

      // Get assignments for this user
      const { data: assignData } = await supabase
        .from('shift_assignments')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

      if (!assignData || assignData.length === 0) {
        setEnrichedShifts([]);
        setLoading(false);
        return;
      }

      const assignments = assignData as ShiftAssignment[];
      const shiftIds = assignments.map((a) => a.shift_id);

      // Fetch shifts
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds)
        .order('start_datetime', { ascending: true });

      if (!shiftsData) {
        setEnrichedShifts([]);
        setLoading(false);
        return;
      }

      const shifts = shiftsData as Shift[];
      const weekIds = [...new Set(shifts.map((s) => s.schedule_week_id))];

      // Fetch schedule weeks (only published)
      const { data: weeksData } = await supabase
        .from('schedule_weeks')
        .select('id, status')
        .in('id', weekIds);

      const weekMap = new Map<string, string>();
      if (weeksData) {
        (weeksData as Pick<ScheduleWeek, 'id' | 'status'>[]).forEach((w) => {
          weekMap.set(w.id, w.status);
        });
      }

      const enriched: EnrichedShift[] = [];
      for (const shift of shifts) {
        const weekStatus = weekMap.get(shift.schedule_week_id) ?? 'draft';
        if (weekStatus !== 'published') continue;
        const assignment = assignments.find((a) => a.shift_id === shift.id);
        if (!assignment) continue;
        enriched.push({ shift, assignment, week_status: weekStatus });
      }

      setEnrichedShifts(enriched);
      setLoading(false);
    };

    fetchShifts();
  }, [user]);

  const getShiftDayLabel = (dateStr: string): string | null => {
    const d = new Date(dateStr);
    if (isToday(d)) return t('mysched.today');
    if (isTomorrow(d)) return t('mysched.tomorrow');
    return null;
  };

  const upcomingShifts = enrichedShifts.filter((s) =>
    isFuture(new Date(s.shift.end_datetime)) || isToday(startOfDay(new Date(s.shift.start_datetime)))
  );
  const pastShifts = enrichedShifts.filter((s) =>
    isPast(new Date(s.shift.end_datetime)) && !isToday(startOfDay(new Date(s.shift.start_datetime)))
  );

  const renderShiftCard = (item: EnrichedShift) => {
    const start = new Date(item.shift.start_datetime);
    const end = new Date(item.shift.end_datetime);
    const dayLabel = getShiftDayLabel(item.shift.start_datetime);
    const duration = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);

    return (
      <Card key={item.assignment.id} className="border-border/50 transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-medium uppercase text-primary">
              {format(start, 'EEE', { locale: dateLocale })}
            </span>
            <span className="font-display text-lg font-bold text-primary">
              {format(start, 'd')}
            </span>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {item.shift.label ?? format(start, 'EEEE, MMM d', { locale: dateLocale })}
              </span>
              {dayLabel && (
                <Badge variant="secondary" className="text-[10px]">{dayLabel}</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {format(start, 'HH:mm')} – {format(end, 'HH:mm')}
              </span>
              <span className="text-xs">({duration}h)</span>
            </div>
            {item.shift.notes && (
              <div className="flex items-start gap-1 pt-1 text-xs text-muted-foreground">
                <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{item.shift.notes}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="font-display text-3xl font-bold">{t('mysched.title')}</h1>
        </div>
        <p className="mt-1 text-muted-foreground">{t('mysched.subtitle')}</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      ) : enrichedShifts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">{t('mysched.no_shifts')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcomingShifts.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">{t('mysched.upcoming')}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingShifts.map(renderShiftCard)}
              </div>
            </div>
          )}
          {pastShifts.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold text-muted-foreground">{t('mysched.past')}</h2>
              <div className="grid gap-3 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
                {pastShifts.map(renderShiftCard)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MySchedulePage;
