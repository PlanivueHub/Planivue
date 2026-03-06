import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Users, Shield, Activity, Search, TrendingUp, CalendarDays, Clock, CalendarCheck, Layers } from 'lucide-react';
import type { Tenant, PlatformMetrics } from '@/types/database';
import { Navigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { fr, enCA } from 'date-fns/locale';

interface EnrichedTenant extends Tenant {
  user_count: number;
  last_activity: string | null;
}

const SaasOwnerDashboard = () => {
  const { hasRole } = useAuth();
  const { t, language } = useLanguage();
  const [tenants, setTenants] = useState<EnrichedTenant[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isSaasOwner = hasRole('saas_owner');
  const dateLocale = language === 'fr' ? fr : enCA;

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsData) {
        const enriched: EnrichedTenant[] = await Promise.all(
          (tenantsData as Tenant[]).map(async (tenant) => {
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_id', tenant.id);

            // Get latest profile update as proxy for last activity
            const { data: latestProfile } = await supabase
              .from('profiles')
              .select('updated_at')
              .eq('tenant_id', tenant.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .single();

            return {
              ...tenant,
              user_count: count ?? 0,
              last_activity: latestProfile?.updated_at ?? null,
            };
          })
        );
        setTenants(enriched);
      }

      const { data: metricsData } = await supabase.rpc('get_platform_metrics');
      if (metricsData) setMetrics(metricsData as unknown as PlatformMetrics);
    } catch (err) {
      console.error('Error fetching SaaS data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isSaasOwner) fetchData();
  }, [isSaasOwner]);

  if (!isSaasOwner) return <Navigate to="/dashboard" replace />;

  const toggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await supabase
      .from('tenants')
      .update({ status: newStatus })
      .eq('id', tenantId);
    fetchData();
  };

  const filteredTenants = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const metricCards = [
    {
      icon: Building2,
      label: t('saas.total_tenants'),
      value: metrics?.total_tenants ?? '—',
      description: t('saas.metric_tenants_desc'),
      gradient: 'from-primary/10 to-primary/5',
      iconColor: 'text-primary',
    },
    {
      icon: Activity,
      label: t('saas.active_tenants'),
      value: metrics?.active_tenants ?? '—',
      description: t('saas.metric_active_desc'),
      gradient: 'from-success/10 to-success/5',
      iconColor: 'text-success',
    },
    {
      icon: Users,
      label: t('saas.total_users'),
      value: metrics?.total_users ?? '—',
      description: t('saas.metric_users_desc'),
      gradient: 'from-accent/10 to-accent/5',
      iconColor: 'text-accent',
    },
    {
      icon: Shield,
      label: t('saas.total_roles'),
      value: metrics?.total_roles ?? '—',
      description: t('saas.metric_roles_desc'),
      gradient: 'from-muted-foreground/10 to-muted-foreground/5',
      iconColor: 'text-muted-foreground',
    },
    {
      icon: CalendarCheck,
      label: t('saas.published_schedules'),
      value: metrics?.published_schedules ?? '—',
      description: t('saas.metric_schedules_desc'),
      gradient: 'from-primary/10 to-primary/5',
      iconColor: 'text-primary',
    },
    {
      icon: Layers,
      label: t('saas.total_shifts'),
      value: metrics?.total_shifts ?? '—',
      description: t('saas.metric_shifts_desc'),
      gradient: 'from-success/10 to-success/5',
      iconColor: 'text-success',
    },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h1 className="font-display text-3xl font-bold">{t('saas.title')}</h1>
          </div>
          <p className="mt-1 text-muted-foreground">{t('saas.subtitle')}</p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/30 text-primary">
          {t('saas.super_admin')}
        </Badge>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map((card) => (
          <Card key={card.label} className="overflow-hidden border-border/50 transition-shadow hover:shadow-md">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`} />
            <CardHeader className="relative flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/80 shadow-sm">
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <p className="font-display text-3xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tenants Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">{t('nav.tenants')}</CardTitle>
            <CardDescription>{t('saas.tenants_table_desc')}</CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">{t('saas.no_tenants')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('saas.tenant_name')}</TableHead>
                    <TableHead>{t('saas.status')}</TableHead>
                    <TableHead>{t('saas.created_at')}</TableHead>
                    <TableHead>{t('saas.last_activity')}</TableHead>
                    <TableHead className="text-right">{t('saas.users_count')}</TableHead>
                    <TableHead className="text-right">{t('saas.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{tenant.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={tenant.status === 'active' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                            tenant.status === 'active' ? 'bg-success-foreground' : 'bg-destructive-foreground'
                          }`} />
                          {t(tenant.status === 'active' ? 'saas.active' : 'saas.suspended')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {format(new Date(tenant.created_at), 'PPP', { locale: dateLocale })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tenant.last_activity ? (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDistanceToNow(new Date(tenant.last_activity), {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono text-sm font-medium">{tenant.user_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={tenant.status === 'active' ? 'outline' : 'default'}
                          size="sm"
                          className="opacity-70 transition-opacity group-hover:opacity-100"
                          onClick={() => toggleTenantStatus(tenant.id, tenant.status)}
                        >
                          {t(tenant.status === 'active' ? 'saas.suspend' : 'saas.activate')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SaasOwnerDashboard;
