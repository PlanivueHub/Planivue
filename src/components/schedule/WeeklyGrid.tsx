import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import { toast } from 'sonner';
import type { ScheduleWeek, Shift, ShiftAssignment, Profile } from '@/types/database';

interface WeeklyGridProps {
  scheduleWeek: ScheduleWeek | null;
  currentWeekStart: Date;
  loading: boolean;
  search: string;
  tenantId: string;
  onRefresh: () => void;
}

interface EmployeeRow {
  id: string;
  name: string;
  initials: string;
  hoursPerWeek: number;
  assignments: Map<number, { shift: Shift; assignment: ShiftAssignment }[]>;
}

const DAYS = [0, 1, 2, 3, 4, 5, 6]; // Sun through Sat

const WeeklyGrid = ({ scheduleWeek, currentWeekStart, loading, search, tenantId, onRefresh }: WeeklyGridProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'fr' ? frLocale : enCA;

  const [employees, setEmployees] = useState<{ id: string; full_name: string | null }[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!scheduleWeek || !tenantId) return;

    const [shiftsRes, assignRes, empRes] = await Promise.all([
      supabase.from('shifts').select('*').eq('schedule_week_id', scheduleWeek.id),
      supabase.from('shift_assignments').select('*').eq('tenant_id', tenantId),
      supabase.from('profiles').select('id, full_name').eq('tenant_id', tenantId),
    ]);

    if (shiftsRes.data) setShifts(shiftsRes.data as Shift[]);
    if (empRes.data) setEmployees(empRes.data as { id: string; full_name: string | null }[]);

    // Filter assignments to only those belonging to shifts in this week
    if (assignRes.data && shiftsRes.data) {
      const shiftIds = new Set((shiftsRes.data as Shift[]).map((s) => s.id));
      setAssignments(
        (assignRes.data as ShiftAssignment[]).filter((a) => shiftIds.has(a.shift_id))
      );
    }
  }, [scheduleWeek, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build employee rows
  const employeeRows: EmployeeRow[] = employees
    .filter((e) => !search || (e.full_name ?? '').toLowerCase().includes(search.toLowerCase()))
    .map((emp) => {
      const empAssignments = assignments.filter((a) => a.user_id === emp.id && a.status !== 'cancelled');
      const dayMap = new Map<number, { shift: Shift; assignment: ShiftAssignment }[]>();

      empAssignments.forEach((a) => {
        const shift = shifts.find((s) => s.id === a.shift_id);
        if (!shift) return;
        const shiftDate = new Date(shift.start_datetime);
        const dayOfWeek = shiftDate.getDay(); // 0=Sun
        const existing = dayMap.get(dayOfWeek) ?? [];
        existing.push({ shift, assignment: a });
        dayMap.set(dayOfWeek, existing);
      });

      // Calculate total hours
      let totalHours = 0;
      empAssignments.forEach((a) => {
        const shift = shifts.find((s) => s.id === a.shift_id);
        if (shift) {
          const ms = new Date(shift.end_datetime).getTime() - new Date(shift.start_datetime).getTime();
          totalHours += ms / (1000 * 60 * 60);
        }
      });

      const name = emp.full_name ?? 'Unknown';
      const parts = name.split(' ');
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

      return {
        id: emp.id,
        name,
        initials,
        hoursPerWeek: Math.round(totalHours * 10) / 10,
        assignments: dayMap,
      };
    });

  const dayDates = DAYS.map((d) => {
    // currentWeekStart is Monday (day 1), we need Sunday (day 0) to Saturday (day 6)
    // Convert: Sunday = currentWeekStart - 1, Monday = currentWeekStart, ..., Saturday = currentWeekStart + 5
    const offset = d === 0 ? -1 : d - 1;
    return addDays(currentWeekStart, offset);
  });

  const dayLabels = [
    t('sched.day_sun'),
    t('sched.day_mon'),
    t('sched.day_tue'),
    t('sched.day_wed'),
    t('sched.day_thu'),
    t('sched.day_fri'),
    t('sched.day_sat'),
  ];

  const openAddShift = (dayIndex: number, employeeId: string) => {
    setSelectedDay(dayIndex);
    setSelectedEmployee(employeeId);
    setStartTime('09:00');
    setEndTime('17:00');
    setDialogOpen(true);
  };

  const handleAddShift = async () => {
    if (!scheduleWeek || !user || selectedDay === null || !selectedEmployee) return;
    setSubmitting(true);

    const shiftDate = dayDates[selectedDay];
    const startDatetime = `${format(shiftDate, 'yyyy-MM-dd')}T${startTime}:00`;
    const endDatetime = `${format(shiftDate, 'yyyy-MM-dd')}T${endTime}:00`;

    // 1. Create shift
    const { data: shiftData, error: shiftError } = await supabase
      .from('shifts')
      .insert({
        tenant_id: tenantId,
        schedule_week_id: scheduleWeek.id,
        start_datetime: startDatetime,
        end_datetime: endDatetime,
      })
      .select()
      .single();

    if (shiftError) {
      toast.error(shiftError.message);
      setSubmitting(false);
      return;
    }

    // 2. Create assignment
    const { error: assignError } = await supabase
      .from('shift_assignments')
      .insert({
        tenant_id: tenantId,
        shift_id: (shiftData as Shift).id,
        user_id: selectedEmployee,
        status: 'assigned',
      });

    if (assignError) {
      toast.error(assignError.message);
    } else {
      toast.success(t('shift.created'));
    }

    setDialogOpen(false);
    setSubmitting(false);
    fetchData();
  };

  const removeAssignment = async (assignmentId: string, shiftId: string) => {
    // Delete assignment then shift
    await supabase.from('shift_assignments').delete().eq('id', assignmentId);
    await supabase.from('shifts').delete().eq('id', shiftId);
    toast.success(t('shift.deleted'));
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!scheduleWeek) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20">
        <CalendarDays className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-medium text-muted-foreground">{t('sched.no_week')}</p>
        <p className="text-sm text-muted-foreground/60">{t('sched.no_week_desc')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="min-w-[180px] font-semibold">{t('shift.employee')}</TableHead>
              {DAYS.map((d, i) => (
                <TableHead key={d} className="min-w-[140px] text-center">
                  <div className="font-semibold">{dayLabels[d]}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(dayDates[i], 'MMM d', { locale: dateLocale })}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employeeRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  {t('sched.no_employees')}
                </TableCell>
              </TableRow>
            ) : (
              employeeRows.map((emp) => (
                <TableRow key={emp.id} className="group">
                  {/* Employee cell */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 text-xs">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {emp.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.hoursPerWeek}h / {t('sched.week')}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Day cells */}
                  {DAYS.map((d, dayIdx) => {
                    const cellAssignments = emp.assignments.get(d) ?? [];
                    return (
                      <TableCell
                        key={d}
                        className="relative cursor-pointer p-2 text-center transition-colors hover:bg-muted/20"
                        onClick={() => {
                          if (scheduleWeek.status === 'draft') openAddShift(dayIdx, emp.id);
                        }}
                      >
                        {cellAssignments.length > 0 ? (
                          <div className="space-y-1">
                            {cellAssignments.map(({ shift, assignment }) => (
                              <div
                                key={assignment.id}
                                className="group/cell relative rounded-md bg-primary/10 px-2 py-1.5 text-xs"
                              >
                                <div className="font-medium text-foreground">
                                  {format(new Date(shift.start_datetime), 'h:mm a')} – {format(new Date(shift.end_datetime), 'h:mm a')}
                                </div>
                                {assignment.status !== 'assigned' && (
                                  <Badge
                                    variant={assignment.status === 'confirmed' ? 'default' : 'destructive'}
                                    className="mt-1 text-[10px]"
                                  >
                                    {assignment.status}
                                  </Badge>
                                )}
                                {scheduleWeek.status === 'draft' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeAssignment(assignment.id, shift.id);
                                    }}
                                    className="absolute -right-1 -top-1 hidden rounded-full bg-destructive p-0.5 text-destructive-foreground group-hover/cell:block"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add shift dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{t('shift.new')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t('shift.employee')}</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name ?? emp.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('shift.start_time')}</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('shift.end_time')}</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleAddShift} className="w-full" disabled={submitting || !selectedEmployee}>
              {submitting ? t('common.loading') : t('shift.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WeeklyGrid;
