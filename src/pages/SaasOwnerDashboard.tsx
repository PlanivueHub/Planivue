import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Users, Shield, Activity } from 'lucide-react';
import type { Tenant, PlatformMetrics } from '@/types/database';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr, enCA } from 'date-fns/locale';

const SaasOwnerDashboard = () => {
  const { hasRole } = useAuth();
  const { t, language } = useLanguage();
  const [tenants, setTenants] = useState<(Tenant & { user_count?: number })[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
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
        // Get user counts per tenant
        const enriched = await Promise.all(
          (tenantsData as Tenant[]).map(async (tenant) => {
            const { count } = await supabase
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('tenant_id', tenant.id);
            return { ...tenant, user_count: count ?? 0 };
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
    fetchData();
  }, []);

  const toggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await supabase
      .from('tenants')
      .update({ status: newStatus })
      .eq('id', tenantId);
    fetchData();
  };

  const metricCards = [
    { icon: Building2, label: t('saas.total_tenants'), value: metrics?.total_tenants ?? '—', color: 'text-primary' },
    { icon: Activity, label: t('saas.active_tenants'), value: metrics?.active_tenants ?? '—', color: 'text-success' },
    { icon: Users, label: t('saas.total_users'), value: metrics?.total_users ?? '—', color: 'text-accent' },
    { icon: Shield, label: t('saas.total_roles'), value: metrics?.total_roles ?? '—', color: 'text-muted-foreground' },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">{t('saas.title')}</h1>
        <p className="mt-1 text-muted-foreground">{t('saas.subtitle')}</p>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tenants Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-lg">{t('nav.tenants')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : tenants.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('saas.no_tenants')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('saas.tenant_name')}</TableHead>
                  <TableHead>{t('saas.status')}</TableHead>
                  <TableHead>{t('saas.created_at')}</TableHead>
                  <TableHead className="text-right">{t('saas.users_count')}</TableHead>
                  <TableHead className="text-right">{t('saas.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                        {t(tenant.status === 'active' ? 'saas.active' : 'saas.suspended')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {format(new Date(tenant.created_at), 'PPP', { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="text-right font-mono">{tenant.user_count}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant={tenant.status === 'active' ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => toggleTenantStatus(tenant.id, tenant.status)}
                      >
                        {t(tenant.status === 'active' ? 'saas.suspend' : 'saas.activate')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SaasOwnerDashboard;
