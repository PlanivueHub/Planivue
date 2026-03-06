import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, CalendarDays, CalendarIcon, Search, Send, Archive, Trash2, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Schedule } from '@/types/database';
import ShiftManager from '@/components/shifts/ShiftManager';

const SchedulesPage = () => {
  const { hasRole, profile, user } = useAuth();
  const { t, language } = useLanguage();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [submitting, setSubmitting] = useState(false);

  const dateLocale = language === 'fr' ? frLocale : enCA;
  const canManage = hasRole('client_admin') || hasRole('client_manager');

  const fetchSchedules = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });
    if (data) setSchedules(data as Schedule[]);
    setLoading(false);
  };

  useEffect(() => {
    if (canManage && profile?.tenant_id) fetchSchedules();
  }, [canManage, profile?.tenant_id]);

  if (!canManage) return <Navigate to="/dashboard" replace />;

  const resetForm = () => {
    setTitle('');
    setStartDate(undefined);
    setEndDate(undefined);
    setEditingSchedule(null);
  };

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setTitle(schedule.title);
    setStartDate(new Date(schedule.start_date));
    setEndDate(new Date(schedule.end_date));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !user || !startDate || !endDate) return;
    setSubmitting(true);

    const payload = {
      title,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
    };

    if (editingSchedule) {
      const { error } = await supabase
        .from('schedules')
        .update(payload)
        .eq('id', editingSchedule.id);
      if (error) { toast.error(error.message); }
      else { toast.success(t('sched.updated')); }
    } else {
      const { error } = await supabase
        .from('schedules')
        .insert({
          ...payload,
          tenant_id: profile.tenant_id,
          created_by: user.id,
          status: 'draft',
        });
      if (error) { toast.error(error.message); }
      else { toast.success(t('sched.created')); }
    }

    resetForm();
    setDialogOpen(false);
    setSubmitting(false);
    fetchSchedules();
  };

  const updateStatus = async (id: string, status: 'published' | 'archived') => {
    const { error } = await supabase
      .from('schedules')
      .update({ status })
      .eq('id', id);
    if (error) toast.error(error.message);
    else toast.success(status === 'published' ? t('sched.published') : t('sched.archived'));
    fetchSchedules();
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success(t('sched.deleted'));
    fetchSchedules();
  };

  const filteredSchedules = schedules.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  const statusConfig: Record<string, { variant: 'secondary' | 'default' | 'destructive'; dot: string }> = {
    draft: { variant: 'secondary', dot: 'bg-muted-foreground' },
    published: { variant: 'default', dot: 'bg-success-foreground' },
    archived: { variant: 'destructive', dot: 'bg-destructive-foreground' },
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="font-display text-3xl font-bold">{t('sched.title')}</h1>
          </div>
          <p className="mt-1 text-muted-foreground">{t('sched.subtitle')}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('sched.new')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingSchedule ? t('sched.edit') : t('sched.new')}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t('sched.schedule_title')}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder={t('sched.title_placeholder')}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('sched.start_date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP', { locale: dateLocale }) : t('sched.pick_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>{t('sched.end_date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP', { locale: dateLocale }) : t('sched.pick_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => startDate ? date < startDate : false}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !startDate || !endDate}>
                {submitting ? t('common.loading') : t('common.save')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="font-display text-lg">{t('nav.schedules')}</CardTitle>
            <CardDescription>{t('sched.table_desc')}</CardDescription>
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
          ) : filteredSchedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">{t('sched.no_schedules')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('sched.schedule_title')}</TableHead>
                    <TableHead>{t('saas.status')}</TableHead>
                    <TableHead>{t('sched.start_date')}</TableHead>
                    <TableHead>{t('sched.end_date')}</TableHead>
                    <TableHead className="text-right">{t('saas.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map((schedule) => {
                    const cfg = statusConfig[schedule.status] ?? statusConfig.draft;
                    return (
                      <TableRow key={schedule.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                              <CalendarDays className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{schedule.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={cfg.variant} className="text-xs">
                            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                            {t(`sched.status_${schedule.status}` as any)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(schedule.start_date), 'PPP', { locale: dateLocale })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(schedule.end_date), 'PPP', { locale: dateLocale })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                            {schedule.status === 'draft' && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(schedule)} title={t('common.edit')}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => updateStatus(schedule.id, 'published')} title={t('sched.publish')}>
                                  <Send className="h-4 w-4 text-success" />
                                </Button>
                              </>
                            )}
                            {schedule.status === 'published' && (
                              <Button variant="ghost" size="icon" onClick={() => updateStatus(schedule.id, 'archived')} title={t('sched.archive')}>
                                <Archive className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" title={t('common.delete')}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('sched.delete_title')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('sched.delete_confirm')} <strong>{schedule.title}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSchedule(schedule.id)}>
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

export default SchedulesPage;
