import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import type { ScheduleWeek } from '@/types/database';
import WeekNavigator from '@/components/schedule/WeekNavigator';
import WeeklyGrid from '@/components/schedule/WeeklyGrid';
import ScheduleToolbar from '@/components/schedule/ScheduleToolbar';

const SchedulesPage = () => {
  const { hasRole, profile, user } = useAuth();
  const { t } = useLanguage();
  const canManage = hasRole('client_admin') || hasRole('client_manager');

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(today.getFullYear(), today.getMonth(), diff);
  });

  const [scheduleWeek, setScheduleWeek] = useState<ScheduleWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const weekStartStr = currentWeekStart.toISOString().split('T')[0];

  const fetchOrCreateWeek = useCallback(async () => {
    if (!profile?.tenant_id || !user) return;
    setLoading(true);

    // Try to fetch existing week
    const { data } = await supabase
      .from('schedule_weeks')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .eq('week_start_date', weekStartStr)
      .maybeSingle();

    if (data) {
      setScheduleWeek(data as ScheduleWeek);
    } else {
      setScheduleWeek(null);
    }
    setLoading(false);
  }, [profile?.tenant_id, user, weekStartStr]);

  useEffect(() => {
    if (canManage) fetchOrCreateWeek();
  }, [canManage, fetchOrCreateWeek]);

  if (!canManage) return <Navigate to="/dashboard" replace />;

  const createWeek = async () => {
    if (!profile?.tenant_id || !user) return;
    const { data, error } = await supabase
      .from('schedule_weeks')
      .insert({
        tenant_id: profile.tenant_id,
        week_start_date: weekStartStr,
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      const { toast } = await import('sonner');
      toast.error(error.message);
    } else {
      setScheduleWeek(data as ScheduleWeek);
    }
  };

  const navigateWeek = (direction: -1 | 1) => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + direction * 7);
      return next;
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h1 className="font-display text-3xl font-bold">{t('sched.title')}</h1>
        </div>
        <p className="mt-1 text-muted-foreground">{t('sched.subtitle')}</p>
      </div>

      {/* Toolbar: week nav + search + create */}
      <ScheduleToolbar
        currentWeekStart={currentWeekStart}
        onNavigateWeek={navigateWeek}
        search={search}
        onSearchChange={setSearch}
        scheduleWeek={scheduleWeek}
        onCreateWeek={createWeek}
      />

      {/* Weekly Grid */}
      <WeeklyGrid
        scheduleWeek={scheduleWeek}
        currentWeekStart={currentWeekStart}
        loading={loading}
        search={search}
        tenantId={profile?.tenant_id ?? ''}
        onRefresh={fetchOrCreateWeek}
      />
    </div>
  );
};

export default SchedulesPage;
