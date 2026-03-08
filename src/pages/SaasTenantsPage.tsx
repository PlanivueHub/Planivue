import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Building2, Users, Search, Plus, Trash2, CalendarDays, Clock } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { fr, enCA } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import type { Tenant } from '@/types/database';

interface EnrichedTenant extends Tenant {
  user_count: number;
  last_activity: string | null;
}

type CascadeDeleteStep = {
  table: string;
  column: string;
  apply?: (query: any) => any;
};

const TENANT_CASCADE_DELETE_STEPS: CascadeDeleteStep[] = [
  { table: 'publication_snapshots', column: 'tenant_id' },
  { table: 'schedule_publications', column: 'tenant_id' },
  { table: 'shift_assignments', column: 'tenant_id' },
  { table: 'shifts', column: 'tenant_id' },
  { table: 'schedule_weeks', column: 'tenant_id' },
  { table: 'schedules', column: 'tenant_id' },
  { table: 'contracts', column: 'tenant_id' },
  { table: 'tenant_financial_config', column: 'tenant_id' },
  { table: 'employee_details', column: 'tenant_id' },
  { table: 'recurring_availability', column: 'tenant_id' },
  { table: 'availability_exceptions', column: 'tenant_id' },
  { table: 'invitations', column: 'tenant_id' },
  { table: 'audit_logs', column: 'tenant_id' },
  {
    table: 'user_roles',
    column: 'tenant_id',
    apply: (query) => query.neq('role', 'saas_owner'),
  },
  { table: 'profiles', column: 'tenant_id' },
];

const isSkippableSchemaCacheError = (error: { code?: string; message?: string } | null) => {
  if (!error) return false;
  return error.code === 'PGRST205' || error.code === '42P01' || (error.message?.includes('schema cache') ?? false);
};

const deleteTenantDirect = async (tenantId: string) => {
  const { data, error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)
    .select('id');

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
};

const invokeDeleteTenantCascade = async (tenantId: string) => {
  const payloads = [
    { _tenant_id: tenantId },
    { tenant_id: tenantId },
    { p_tenant_id: tenantId },
    { id: tenantId },
  ];
  let lastError: { code?: string; message?: string } | null = null;

  for (const payload of payloads) {
    const { error } = await (supabase.rpc as any)('delete_tenant_cascade', payload);

    if (!error) {
      return null;
    }

    lastError = error;

    if (error.code !== 'PGRST202') {
      break;
    }
  }

  return lastError;
};

const deleteTenantCascadeFallback = async (tenantId: string) => {
  const deletedDirectly = await deleteTenantDirect(tenantId);
  if (deletedDirectly) return;

  for (const step of TENANT_CASCADE_DELETE_STEPS) {
    let query = (supabase.from as any)(step.table).delete().eq(step.column, tenantId);
    if (step.apply) {
      query = step.apply(query);
    }

    const { error } = await query;

    if (error && !isSkippableSchemaCacheError(error)) {
      throw new Error(`${step.table}: ${error.message}`);
    }
  }

  const deletedAfterCascade = await deleteTenantDirect(tenantId);
  if (!deletedAfterCascade) {
    throw new Error('Delete was blocked by permissions or remaining linked records.');
  }
};

const SaasTenantsPage = () => {
  const { hasRole } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<EnrichedTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isSaasOwner = hasRole('saas_owner');
  const dateLocale = language === 'fr' ? fr : enCA;

  const fetchTenants = async () => {
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

            const { data: latestProfile } = await supabase
              .from('profiles')
              .select('updated_at')
              .eq('tenant_id', tenant.id)
              .order('updated_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              ...tenant,
              user_count: count ?? 0,
              last_activity: latestProfile?.updated_at ?? null,
            };
          })
        );
        setTenants(enriched);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isSaasOwner) fetchTenants();
  }, [isSaasOwner]);

  if (!isSaasOwner) return <Navigate to="/dashboard" replace />;

  const createTenant = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from('tenants').insert({
      name: newName.trim(),
      status: 'active',
      locale: 'fr-CA',
    });
    if (error) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } else {
      toast({ title: t('saas.tenant_created') });
      setNewName('');
      setCreateOpen(false);
      fetchTenants();
    }
    setCreating(false);
  };

  const toggleStatus = async (tenantId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('tenants')
      .update({ status: newStatus })
      .eq('id', tenantId);
    if (!error) fetchTenants();
  };

  const deleteTenant = async () => {
    if (!deleteTarget) return;
    const tenantId = deleteTarget.id;

    setDeleting(true);

    let errorMessage: string | null = null;

    const rpcError = await invokeDeleteTenantCascade(tenantId);

    if (rpcError) {
      if (rpcError.code === 'PGRST202') {
        try {
          await deleteTenantCascadeFallback(tenantId);
        } catch (fallbackError) {
          errorMessage = fallbackError instanceof Error ? fallbackError.message : t('common.error');
        }
      } else {
        errorMessage = rpcError.message ?? t('common.error');
      }
    }

    if (!errorMessage) {
      const { data: stillExists, error: verifyError } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', tenantId)
        .maybeSingle();

      if (verifyError) {
        errorMessage = verifyError.message;
      } else if (stillExists) {
        errorMessage = 'Tenant could not be removed. Please try again.';
      }
    }

    if (errorMessage) {
      toast({ title: t('common.error'), description: errorMessage, variant: 'destructive' });
    } else {
      setTenants((prev) => prev.filter((tenant) => tenant.id !== tenantId));
      toast({ title: t('saas.tenant_deleted') });
      setDeleteTarget(null);
      fetchTenants();
    }

    setDeleting(false);
  };

  const filtered = tenants.filter((tenant) =>
    tenant.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="font-display text-3xl font-bold">{t('saas.tenants_title')}</h1>
          </div>
          <p className="mt-1 text-muted-foreground">{t('saas.tenants_table_desc')}</p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('saas.create_tenant')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('saas.create_tenant')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('saas.tenant_name')}</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('saas.tenant_name')}
                  onKeyDown={(e) => e.key === 'Enter' && createTenant()}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t('common.cancel')}</Button>
              </DialogClose>
              <Button onClick={createTenant} disabled={creating || !newName.trim()}>
                {creating ? t('auth.loading') : t('saas.create_tenant')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">{t('nav.tenants')}</CardTitle>
            <CardDescription>
              {filtered.length} {t('saas.tenants_count')}
            </CardDescription>
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
          ) : filtered.length === 0 ? (
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
                  {filtered.map((tenant) => (
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={tenant.status === 'active' ? 'outline' : 'default'}
                            size="sm"
                            className="opacity-70 transition-opacity group-hover:opacity-100"
                            onClick={() => toggleStatus(tenant.id, tenant.status)}
                          >
                            {t(tenant.status === 'active' ? 'saas.suspend' : 'saas.activate')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => setDeleteTarget(tenant)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('saas.delete_tenant_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('saas.delete_tenant_confirm')} <strong>{deleteTarget?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTenant}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('auth.loading') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SaasTenantsPage;

