import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, CalendarDays, FileText, DollarSign, AlertTriangle, Search, Clock, Edit } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import RecentActivityFeed from '@/components/dashboard/RecentActivityFeed';
import { format, differenceInDays, addDays, formatDistanceToNow } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { Contract } from '@/types/database';

interface DashboardCounts {
  contracts: number;
  team: number;
  schedules: number;
  shifts: number;
}

const CHART_COLORS = {
  regular: 'hsl(var(--chart-primary))',
  overtime: 'hsl(var(--chart-overtime))',
  benefits: 'hsl(var(--chart-benefits))',
  profit: 'hsl(var(--chart-profit))',
  error: 'hsl(var(--chart-error))',
};

// Sample labour data — replace with real queries when available
const LABOUR_DATA = [
  { month: 'Jan', scheduled: 18000, actual: 16400 },
  { month: 'Feb', scheduled: 22000, actual: 20100 },
  { month: 'Mar', scheduled: 19000, actual: 17800 },
  { month: 'Apr', scheduled: 26000, actual: 24200 },
  { month: 'May', scheduled: 30000, actual: 28600 },
  { month: 'Jun', scheduled: 42000, actual: 56458 },
  { month: 'Jul', scheduled: 35000, actual: 32000 },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, highestRole } = useAuth();
  const { t, language } = useLanguage();
  const role = highestRole();
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractSearch, setContractSearch] = useState('');

  const dateLocale = language === 'fr' ? frLocale : enCA;

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.tenant_id) return;
      setLoading(true);

      const [contractsRes, contractsDataRes, teamRes, schedulesRes, shiftsRes] = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('contracts').select('*').eq('tenant_id', profile.tenant_id).order('updated_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
        supabase.from('schedules').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id).eq('status', 'published'),
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

  // Labour cost donut data
  const labourCostData = useMemo(() => {
    const totalActual = LABOUR_DATA.reduce((s, d) => s + d.actual, 0);
    const totalScheduled = LABOUR_DATA.reduce((s, d) => s + d.scheduled, 0);
    const labourCost = Math.round(totalActual * 0.642);
    const overtimeCost = Math.round(totalActual * 0.143);
    const budgetRemaining = Math.max(0, totalScheduled - totalActual);
    const percentage = Math.round((labourCost / (labourCost + overtimeCost + budgetRemaining)) * 100);

    return {
      percentage,
      data: [
        { name: t('dashboard.labour_cost'), value: labourCost },
        { name: t('dashboard.overtime_cost'), value: overtimeCost },
        { name: t('dashboard.budget_remaining'), value: budgetRemaining },
      ],
    };
  }, [t]);

  const donutColors = [CHART_COLORS.regular, CHART_COLORS.overtime, CHART_COLORS.profit];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
    }).format(v);

  const filteredContracts = contracts.filter((c) =>
    c.title.toLowerCase().includes(contractSearch.toLowerCase()) ||
    c.client_name.toLowerCase().includes(contractSearch.toLowerCase())
  );

  const metricCards = [
    {
      icon: Users,
      label: t('dashboard.total_employees'),
      value: counts?.team ?? 0,
      gradient: 'from-primary/20 to-primary/5',
      iconBg: 'bg-primary/20',
      iconColor: 'text-primary',
    },
    {
      icon: FileText,
      label: t('dashboard.active_contracts'),
      value: activeContracts.length,
      gradient: 'from-chart-benefits/20 to-chart-benefits/5',
      iconBg: 'bg-chart-benefits/20',
      iconColor: 'text-chart-benefits',
    },
    {
      icon: CalendarDays,
      label: t('dashboard.active_schedules'),
      value: counts?.schedules ?? 0,
      gradient: 'from-success/20 to-success/5',
      iconBg: 'bg-success/20',
      iconColor: 'text-success',
    },
    {
      icon: AlertTriangle,
      label: t('dashboard.pending_requests'),
      value: expiringSoon.length,
      gradient: 'from-warning/20 to-warning/5',
      iconBg: 'bg-warning/20',
      iconColor: 'text-warning',
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {t('dashboard.welcome_back')}, {profile?.full_name || ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('dashboard.welcome_subtitle')}
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
          <Edit className="h-4 w-4" />
        </Button>
      </div>

      {/* Metric Cards - 4 pill-style cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card
            key={card.label}
            className="relative overflow-hidden border-border/50 transition-shadow hover:shadow-md"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
            <CardContent className="relative flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                <card.icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                <p className="font-display text-2xl font-bold">{loading ? '...' : card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row - Labour Hours Bar + Labour Cost Donut */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Labour Hours Overview Bar Chart */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-display text-base">{t('dashboard.labour_hours_overview')}</CardTitle>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.regular }} />
                <span className="text-muted-foreground">{t('dashboard.scheduled_hours')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.overtime }} />
                <span className="text-muted-foreground">{t('dashboard.actual_hours')}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={LABOUR_DATA} barGap={4}>
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  formatter={(v: number, name: string) => {
                    const labels: Record<string, string> = {
                      scheduled: t('dashboard.scheduled_hours'),
                      actual: t('dashboard.actual_hours'),
                    };
                    return [formatCurrency(v), labels[name] || name];
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="scheduled" fill={CHART_COLORS.regular} radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="actual" fill={CHART_COLORS.overtime} radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Labour Cost Analysis Donut */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">{t('dashboard.labour_cost_analysis')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={labourCostData.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    stroke="hsl(var(--card))"
                    strokeWidth={3}
                  >
                    {labourCostData.data.map((_, i) => (
                      <Cell key={i} fill={donutColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v)]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center percentage */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-2xl font-bold">{labourCostData.percentage}%</span>
              </div>
            </div>
            {/* Legend */}
            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2">
              {labourCostData.data.map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: donutColors[i] }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contracts Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="font-display text-base">{t('dashboard.contracts_title')}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/contracts')}>
              {t('common.see_all')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">{t('contract.no_contracts')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('contract.title')}</TableHead>
                    <TableHead>{t('contract.value')}</TableHead>
                    <TableHead>{t('saas.status')}</TableHead>
                    <TableHead className="text-right">{t('dashboard.last_updated')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.slice(0, 5).map((contract) => (
                    <TableRow key={contract.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => navigate('/contracts')}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{contract.title}</p>
                            <p className="text-xs text-muted-foreground">{contract.client_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">
                          {contract.value ? formatCurrency(contract.value) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            contract.status === 'active' ? 'default' :
                            contract.status === 'completed' ? 'secondary' : 'destructive'
                          }
                          className="text-xs"
                        >
                          {t(`contract.status_${contract.status}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(contract.updated_at), {
                            addSuffix: true,
                            locale: dateLocale,
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Feed */}
      {profile?.tenant_id && <RecentActivityFeed tenantId={profile.tenant_id} />}
    </div>
  );
};

export default Dashboard;
