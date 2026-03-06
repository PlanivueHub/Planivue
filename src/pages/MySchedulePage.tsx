import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, FileText } from 'lucide-react';
import { format, isToday, isTomorrow, isPast, isFuture, startOfDay } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { Shift, Schedule } from '@/types/database';

interface EnrichedShift extends Shift {
  schedule_title: string;
  schedule_status: string;
}

const MySchedulePage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [shifts, setShifts] = useState<EnrichedShift[]>([]);
  const [loading, setLoading] = useState(true);
  const dateLocale = language === 'fr' ? frLocale : enCA;

  useEffect(() => {
    const fetchShifts = async () => {
      if (!user) return;
      setLoading(true);

      // Fetch shifts for this user with schedule info
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (!shiftsData || shiftsData.length === 0) {
        setShifts([]);
        setLoading(false);
        return;
      }

      // Fetch related schedules (only published ones shown)
      const scheduleIds = [...new Set((shiftsData as Shift[]).map((s) => s.schedule_id))];
      const { data: schedulesData } = await supabase
        .from('schedules')
        .select('id, title, status')
        .in('id', scheduleIds);

      const scheduleMap = new Map<string, { title: string; status: string }>();
      if (schedulesData) {
        (schedulesData as Pick<Schedule, 'id' | 'title' | 'status'>[]).forEach((s) => {
          scheduleMap.set(s.id, { title: s.title, status: s.status });
        });
      }

      const enriched: EnrichedShift[] = (shiftsData as Shift[])
        .map((shift) => {
          const sched = scheduleMap.get(shift.schedule_id);
          return {
            ...shift,
            schedule_title: sched?.title ?? '—',
            schedule_status: sched?.status ?? 'draft',
          };
        })
        .filter((s) => s.schedule_status === 'published');

      setShifts(enriched);
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

  const upcomingShifts = shifts.filter((s) => isFuture(new Date(s.end_time)) || isToday(startOfDay(new Date(s.start_time))));
  const pastShifts = shifts.filter((s) => isPast(new Date(s.end_time)) && !isToday(startOfDay(new Date(s.start_time))));

  const renderShiftCard = (shift: EnrichedShift) => {
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    const dayLabel = getShiftDayLabel(shift.start_time);
    const duration = ((end.getTime() - start.getTime()) / 3600000).toFixed(1);

    return (
      <Card key={shift.id} className="border-border/50 transition-shadow hover:shadow-md">
        <CardContent className="flex items-start gap-4 p-4">
          {/* Date block */}
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-medium uppercase text-primary">
              {format(start, 'EEE', { locale: dateLocale })}
            </span>
            <span className="font-display text-lg font-bold text-primary">
              {format(start, 'd')}
            </span>
          </div>

          {/* Details */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{shift.schedule_title}</span>
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
            {shift.notes && (
              <div className="flex items-start gap-1 pt-1 text-xs text-muted-foreground">
                <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{shift.notes}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
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
      ) : shifts.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">{t('mysched.no_shifts')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming */}
          {upcomingShifts.length > 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">{t('mysched.upcoming')}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingShifts.map(renderShiftCard)}
              </div>
            </div>
          )}

          {/* Past */}
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
