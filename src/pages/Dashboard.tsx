import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CalendarDays, FileText, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import { format, differenceInDays, addDays } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { Contract } from '@/types/database';

interface DashboardCounts {
  contracts: number;
  team: number;
  schedules: number;
  shifts: number;
}

const CHART_COLORS = [
  'hsl(var(--chart-primary))',
  'hsl(var(--chart-overtime))',
  'hsl(var(--chart-benefits))',
  'hsl(var(--chart-profit))',
  'hsl(var(--chart-error))',
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, highestRole } = useAuth();
  const { t, language } = useLanguage();
  const role = highestRole();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const roleLabel = role ? t(`role.${role}` as any) : '';
  const dateLocale = language === 'fr' ? frLocale : enCA;

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id) return;
      setLoading(true);

      const [contractsRes, contractsDataRes, teamRes, schedulesRes, shiftsRes] = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('contracts').select('*').eq('tenant_id', profile.tenant_id).order('start_date', { ascending: true }),
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

      if (contractsDataRes.data) setContracts(contractsDataRes.data as Contract[]);
      setLoading(false);
    };

    fetchData();
  }, [profile?.tenant_id]);

  // Derived analytics
  const totalValue = contracts.reduce((sum, c) => sum + (c.value ?? 0), 0);
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const today = new Date();
  const soonThreshold = addDays(today, 30);
  const expiringSoon = contracts.filter((c) => {
    if (!c.end_date || c.status !== 'active') return false;
    const end = new Date(c.end_date);
    return end >= today && end <= soonThreshold;
  });

  // Chart: status distribution
  const statusCounts = contracts.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: t(`contract.status_${name}` as any),
    value,
  }));

  // Chart: values over time (by month of start_date)
  const barData = contracts
    .filter((c) => c.value)
    .reduce<Record<string, number>>((acc, c) => {
      const month = format(new Date(c.start_date), 'MMM yyyy', { locale: dateLocale });
      acc[month] = (acc[month] || 0) + (c.value ?? 0);
      return acc;
    }, {});
  const barChartData = Object.entries(barData).map(([month, total]) => ({ month, total }));

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(v);

  const summaryCards = [
    { icon: DollarSign, label: t('dashboard.total_value'), value: formatCurrency(totalValue), color: 'text-success', onClick: () => navigate('/contracts') },
    { icon: FileText, label: t('dashboard.active_contracts'), value: activeContracts.length, color: 'text-primary', onClick: () => navigate('/contracts') },
    { icon: AlertTriangle, label: t('dashboard.expiring_soon'), value: expiringSoon.length, color: 'text-warning', onClick: () => navigate('/contracts') },
    { icon: Users, label: t('nav.team'), value: counts?.team ?? 0, color: 'text-primary', onClick: () => navigate('/team') },
    { icon: CalendarDays, label: t('nav.schedules'), value: counts?.schedules ?? 0, color: 'text-chart-benefits', onClick: () => navigate('/schedules') },
    { icon: TrendingUp, label: t('dashboard.shifts_label'), value: counts?.shifts ?? 0, color: 'text-destructive', onClick: () => navigate('/schedules') },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold">
          {t('dashboard.welcome')}, {profile?.full_name || ''}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('dashboard.overview')} — <span className="text-primary font-medium">{roleLabel}</span>
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-border/50 cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={card.onClick}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">
                {loading ? '...' : card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart - contract values over time */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-base">{t('dashboard.values_over_time')}</CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {t('contract.no_contracts')}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barChartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), t('contract.value')]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie chart - status distribution */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-base">{t('dashboard.status_distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {t('contract.no_contracts')}
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      {profile?.tenant_id && <RecentActivityFeed tenantId={profile.tenant_id} />}

      {/* Expiring soon alerts */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t('dashboard.expiring_alerts')}
          </CardTitle>
          <CardDescription>{t('dashboard.expiring_soon')} (30 {t('dashboard.days_left')})</CardDescription>
        </CardHeader>
        <CardContent>
          {expiringSoon.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('dashboard.no_expiring')}</p>
          ) : (
            <div className="space-y-3">
              {expiringSoon.map((c) => {
                const daysLeft = differenceInDays(new Date(c.end_date!), today);
                return (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                        <FileText className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.client_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t('dashboard.expires_on')} {format(new Date(c.end_date!), 'PP', { locale: dateLocale })}
                        </p>
                        <Badge variant={daysLeft <= 7 ? 'destructive' : 'secondary'} className="text-xs">
                          {daysLeft} {t('dashboard.days_left')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
