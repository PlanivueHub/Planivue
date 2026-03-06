import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CalendarDays, FileText } from 'lucide-react';

interface DashboardCounts {
  contracts: number;
  team: number;
  schedules: number;
  shifts: number;
}

const Dashboard = () => {
  const { profile, highestRole } = useAuth();
  const { t } = useLanguage();
  const role = highestRole();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const roleLabel = role ? t(`role.${role}` as any) : '';

  useEffect(() => {
    const fetchCounts = async () => {
      if (!profile?.tenant_id) return;
      setLoading(true);

      const [contractsRes, teamRes, schedulesRes, shiftsRes] = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('schedules').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
      ]);

      setCounts({
        contracts: contractsRes.count ?? 0,
        team: teamRes.count ?? 0,
        schedules: schedulesRes.count ?? 0,
        shifts: shiftsRes.count ?? 0,
      });
      setLoading(false);
    };

    fetchCounts();
  }, [profile?.tenant_id]);

  const cards = [
    { icon: FileText, label: t('nav.contracts'), value: counts?.contracts },
    { icon: Users, label: t('nav.team'), value: counts?.team },
    { icon: CalendarDays, label: t('nav.schedules'), value: counts?.schedules },
    { icon: Building2, label: language === 'fr' ? 'Quarts' : 'Shifts', value: counts?.shifts },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">
          {t('dashboard.welcome')}, {profile?.full_name || ''}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('dashboard.overview')} — <span className="text-primary font-medium">{roleLabel}</span>
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">
                {loading ? '...' : (card.value ?? 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
