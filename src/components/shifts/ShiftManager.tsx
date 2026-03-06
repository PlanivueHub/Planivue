import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { Shift, Profile } from '@/types/database';

interface ShiftManagerProps {
  scheduleId: string;
  tenantId: string;
}

const ShiftManager = ({ scheduleId, tenantId }: ShiftManagerProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'fr' ? frLocale : enCA;

  const [shifts, setShifts] = useState<(Shift & { employee_name: string })[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [notes, setNotes] = useState('');

  const fetchShifts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('start_time', { ascending: true });

    if (data) {
      // Get employee names
      const userIds = [...new Set((data as Shift[]).map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const nameMap = new Map<string, string>();
      if (profiles) {
        (profiles as Pick<Profile, 'id' | 'full_name'>[]).forEach((p) => {
          nameMap.set(p.id, p.full_name ?? p.id);
        });
      }

      setShifts(
        (data as Shift[]).map((s) => ({
          ...s,
          employee_name: nameMap.get(s.user_id) ?? s.user_id,
        }))
      );
    }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('tenant_id', tenantId);

    if (data) {
      setEmployees(
        (data as Pick<Profile, 'id' | 'full_name'>[]).map((p) => ({
          id: p.id,
          name: p.full_name ?? p.id,
        }))
      );
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, [scheduleId]);

  const resetForm = () => {
    setSelectedEmployee('');
    setShiftDate('');
    setStartTime('08:00');
    setEndTime('16:00');
    setNotes('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !shiftDate) return;
    setSubmitting(true);

    const startDateTime = `${shiftDate}T${startTime}:00`;
    const endDateTime = `${shiftDate}T${endTime}:00`;

    const { error } = await supabase.from('shifts').insert({
      schedule_id: scheduleId,
      tenant_id: tenantId,
      user_id: selectedEmployee,
      start_time: startDateTime,
      end_time: endDateTime,
      notes: notes || null,
    });

    if (error) toast.error(error.message);
    else {
      toast.success(t('shift.created'));
      resetForm();
      setDialogOpen(false);
      fetchShifts();
    }
    setSubmitting(false);
  };

  const deleteShift = async (id: string) => {
    const { error } = await supabase.from('shifts').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success(t('shift.deleted'));
      fetchShifts();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Clock className="h-4 w-4 text-primary" />
          {t('shift.title')}
        </h3>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t('shift.new')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{t('shift.new')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t('shift.employee')}</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('shift.select_employee')} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('shift.date')}</Label>
                <Input type="date" value={shiftDate} onChange={(e) => setShiftDate(e.target.value)} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('shift.start_time')}</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t('shift.end_time')}</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('shift.notes')}</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('shift.notes_placeholder')}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !selectedEmployee || !shiftDate}>
                {submitting ? t('common.loading') : t('shift.add')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : shifts.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 opacity-40" />
          <p className="mt-2 text-sm">{t('shift.no_shifts')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('shift.employee')}</TableHead>
                <TableHead>{t('shift.date')}</TableHead>
                <TableHead>{t('shift.start_time')}</TableHead>
                <TableHead>{t('shift.end_time')}</TableHead>
                <TableHead>{t('shift.notes')}</TableHead>
                <TableHead className="text-right">{t('saas.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id} className="group">
                  <TableCell className="font-medium">{shift.employee_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(shift.start_time), 'PPP', { locale: dateLocale })}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(shift.start_time), 'HH:mm')}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(shift.end_time), 'HH:mm')}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {shift.notes ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-70 hover:text-destructive group-hover:opacity-100">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('shift.delete_title')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('shift.delete_confirm')} <strong>{shift.employee_name}</strong>?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteShift(shift.id)}>
                            {t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ShiftManager;
