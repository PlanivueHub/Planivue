import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, FileText, CalendarIcon, Search, Trash2, Edit, DollarSign, ArrowUpDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Contract, BreakRule } from '@/types/database';
import BreakRulesEditor from '@/components/contracts/BreakRulesEditor';

type ContractStatus = 'draft' | 'active' | 'completed' | 'cancelled';

const ContractsPage = () => {
  const { hasRole, profile, user } = useAuth();
  const { t, language } = useLanguage();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContractStatus | 'all'>('all');
  const [sortField, setSortField] = useState<'title' | 'client_name' | 'start_date' | 'value'>('start_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [status, setStatus] = useState<ContractStatus>('draft');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [billingRate, setBillingRate] = useState('');
  const [breakRules, setBreakRules] = useState<BreakRule[]>([]);

  const dateLocale = language === 'fr' ? frLocale : enCA;
  const canManage = hasRole('client_admin') || hasRole('client_manager');

  const fetchContracts = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });
    if (data) setContracts(data as Contract[]);
    setLoading(false);
  };

  useEffect(() => {
    if (canManage && profile?.tenant_id) fetchContracts();
  }, [canManage, profile?.tenant_id]);

  if (!canManage) return <Navigate to="/dashboard" replace />;

  const resetForm = () => {
    setTitle(''); setClientName(''); setStatus('draft');
    setStartDate(undefined); setEndDate(undefined);
    setValue(''); setDescription(''); setEditing(null);
    setBillingRate(''); setBreakRules([]);
  };

  const openEdit = (c: Contract) => {
    setEditing(c);
    setTitle(c.title);
    setClientName(c.client_name);
    setStatus(c.status);
    setStartDate(new Date(c.start_date));
    setEndDate(c.end_date ? new Date(c.end_date) : undefined);
    setValue(c.value?.toString() ?? '');
    setDescription(c.description ?? '');
    setBillingRate(c.billing_rate?.toString() ?? '');
    setBreakRules(c.break_rules ?? []);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !user || !startDate) return;
    setSubmitting(true);

    const payload = {
      title,
      client_name: clientName,
      status,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: endDate ? format(endDate, 'yyyy-MM-dd') : null,
      value: value ? parseFloat(value) : null,
      description: description || null,
      billing_rate: billingRate ? parseFloat(billingRate) : null,
      break_rules: breakRules,
    };

    if (editing) {
      const { error } = await supabase.from('contracts').update(payload).eq('id', editing.id);
      if (error) toast.error(error.message);
      else toast.success(t('contract.updated'));
    } else {
      const { error } = await supabase.from('contracts').insert({
        ...payload,
        tenant_id: profile.tenant_id,
        created_by: user.id,
      });
      if (error) toast.error(error.message);
      else toast.success(t('contract.created'));
    }

    resetForm();
    setDialogOpen(false);
    setSubmitting(false);
    fetchContracts();
  };

  const deleteContract = async (id: string) => {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success(t('contract.deleted'));
    fetchContracts();
  };

  const filtered = contracts
    .filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.client_name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = a.title.localeCompare(b.title); break;
        case 'client_name': cmp = a.client_name.localeCompare(b.client_name); break;
        case 'start_date': cmp = new Date(a.start_date).getTime() - new Date(b.start_date).getTime(); break;
        case 'value': cmp = (a.value ?? 0) - (b.value ?? 0); break;
      }
      return sortAsc ? cmp : -cmp;
    });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const hasActiveFilters = filterStatus !== 'all' || search !== '';
  const clearFilters = () => { setFilterStatus('all'); setSearch(''); };

  const statusCfg: Record<string, { variant: 'secondary' | 'default' | 'destructive' | 'outline'; dot: string }> = {
    draft: { variant: 'secondary', dot: 'bg-muted-foreground' },
    active: { variant: 'default', dot: 'bg-success-foreground' },
    completed: { variant: 'outline', dot: 'bg-primary' },
    cancelled: { variant: 'destructive', dot: 'bg-destructive-foreground' },
  };

  const statusOptions: { value: ContractStatus; label: string }[] = [
    { value: 'draft', label: t('contract.status_draft') },
    { value: 'active', label: t('contract.status_active') },
    { value: 'completed', label: t('contract.status_completed') },
    { value: 'cancelled', label: t('contract.status_cancelled') },
  ];

  const formatCurrency = (v: number | null) => {
    if (v === null || v === undefined) return '—';
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency', currency: 'CAD',
    }).format(v);
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="font-display text-3xl font-bold">{t('contract.title')}</h1>
          </div>
          <p className="mt-1 text-muted-foreground">{t('contract.subtitle')}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('contract.new')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editing ? t('contract.edit') : t('contract.new')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('contract.contract_title')}</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={t('contract.title_placeholder')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('contract.client_name')}</Label>
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder={t('contract.client_placeholder')} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('contract.contract_status')}</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('contract.value')}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="number" step="0.01" min="0"
                      value={value} onChange={(e) => setValue(e.target.value)}
                      className="pl-9" placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('sched.start_date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP', { locale: dateLocale }) : t('sched.pick_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn('p-3 pointer-events-auto')} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>{t('sched.end_date')} ({t('contract.optional')})</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP', { locale: dateLocale }) : t('sched.pick_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(d) => startDate ? d < startDate : false} initialFocus className={cn('p-3 pointer-events-auto')} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('contract.description')}</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('contract.desc_placeholder')} rows={3} />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !startDate}>
                {submitting ? t('common.loading') : t('common.save')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="font-display text-lg">{t('nav.contracts')}</CardTitle>
              <CardDescription>{t('contract.table_desc')}</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ContractStatus | 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('contract.contract_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('contract.filter_all_statuses')}</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs text-muted-foreground">
                <X className="h-3 w-3" />
                {t('contract.clear_filters')}
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} / {contracts.length}
            </span>
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
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">{t('contract.no_contracts')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('title')}>
                      <span className="flex items-center gap-1">{t('contract.contract_title')} <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('client_name')}>
                      <span className="flex items-center gap-1">{t('contract.client_name')} <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
                    </TableHead>
                    <TableHead>{t('saas.status')}</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('start_date')}>
                      <span className="flex items-center gap-1">{t('sched.start_date')} <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
                    </TableHead>
                    <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort('value')}>
                      <span className="flex items-center justify-end gap-1">{t('contract.value')} <ArrowUpDown className="h-3 w-3 text-muted-foreground" /></span>
                    </TableHead>
                    <TableHead className="text-right">{t('saas.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => {
                    const cfg = statusCfg[c.status] ?? statusCfg.draft;
                    return (
                      <TableRow key={c.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{c.title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{c.client_name}</TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="text-xs">
                            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {t(`contract.status_${c.status}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(c.start_date), 'PPP', { locale: dateLocale })}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(c.value)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)} title={t('common.edit')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" title={t('common.delete')}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('contract.delete_title')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('contract.delete_confirm')} <strong>{c.title}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteContract(c.id)}>
                                    {t('common.delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContractsPage;
