import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, CalendarIcon, Clock, Plus, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { RecurringAvailability, AvailabilityException } from '@/types/database';

const DAYS = [0, 1, 2, 3, 4, 5, 6];

const AvailabilityManager = () => {
  const { user, profile } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'fr' ? frLocale : enCA;

  const [slots, setSlots] = useState<RecurringAvailability[]>([]);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [loading, setLoading] = useState(true);

  // Add slot form
  const [slotDay, setSlotDay] = useState<string>('0');
  const [slotStart, setSlotStart] = useState('08:00');
  const [slotEnd, setSlotEnd] = useState('17:00');

  // Add exception form
  const [excDate, setExcDate] = useState<Date | undefined>();
  const [excAvailable, setExcAvailable] = useState(false);
  const [excStart, setExcStart] = useState('');
  const [excEnd, setExcEnd] = useState('');
  const [excReason, setExcReason] = useState('');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [slotsRes, excRes] = await Promise.all([
      supabase
        .from('recurring_availability')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('start_time'),
      supabase
        .from('availability_exceptions')
        .select('*')
        .eq('user_id', user.id)
        .order('exception_date', { ascending: true }),
    ]);

    setSlots((slotsRes.data as RecurringAvailability[]) ?? []);
    setExceptions((excRes.data as AvailabilityException[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const addSlot = async () => {
    if (!user || !profile?.tenant_id) return;
    const { error } = await supabase.from('recurring_availability').insert({
      user_id: user.id,
      tenant_id: profile.tenant_id,
      day_of_week: parseInt(slotDay),
      start_time: slotStart,
      end_time: slotEnd,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t('avail.slot_added'));
    fetchData();
  };

  const deleteSlot = async (id: string) => {
    const { error } = await supabase.from('recurring_availability').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(t('avail.slot_deleted')); fetchData(); }
  };

  const addException = async () => {
    if (!user || !profile?.tenant_id || !excDate) return;
    const { error } = await supabase.from('availability_exceptions').insert({
      user_id: user.id,
      tenant_id: profile.tenant_id,
      exception_date: format(excDate, 'yyyy-MM-dd'),
      is_available: excAvailable,
      start_time: excAvailable && excStart ? excStart : null,
      end_time: excAvailable && excEnd ? excEnd : null,
      reason: excReason || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t('avail.exception_added'));
    setExcDate(undefined);
    setExcReason('');
    setExcStart('');
    setExcEnd('');
    fetchData();
  };

  const deleteException = async (id: string) => {
    const { error } = await supabase.from('availability_exceptions').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(t('avail.exception_deleted')); fetchData(); }
  };

  const dayLabel = (d: number) => t(`avail.day_${d}` as any);

  // Group slots by day
  const slotsByDay = DAYS.map((d) => ({
    day: d,
    label: dayLabel(d),
    slots: slots.filter((s) => s.day_of_week === d),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="recurring">
        <TabsList>
          <TabsTrigger value="recurring">{t('avail.recurring')}</TabsTrigger>
          <TabsTrigger value="exceptions">{t('avail.exceptions')}</TabsTrigger>
        </TabsList>

        {/* Recurring Weekly Availability */}
        <TabsContent value="recurring" className="space-y-4 pt-4">
          {/* Add slot form */}
          <Card className="border-border/50">
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="space-y-1">
                <Label className="text-xs">{t('shift.date')}</Label>
                <Select value={slotDay} onValueChange={setSlotDay}>
                  <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d} value={d.toString()}>{dayLabel(d)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('shift.start_time')}</Label>
                <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="w-[120px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('shift.end_time')}</Label>
                <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} className="w-[120px]" />
              </div>
              <Button onClick={addSlot} size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                {t('avail.add_slot')}
              </Button>
            </CardContent>
          </Card>

          {/* Weekly grid */}
          <div className="grid gap-3">
            {slotsByDay.map(({ day, label, slots: daySlots }) => (
              <Card key={day} className="border-border/50">
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="w-24 shrink-0">
                    <p className="text-sm font-medium">{label}</p>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {daySlots.length === 0 ? (
                      <span className="text-xs text-muted-foreground">{t('avail.no_slots')}</span>
                    ) : (
                      daySlots.map((slot) => (
                        <Badge key={slot.id} variant="secondary" className="gap-1.5 pr-1">
                          <Clock className="h-3 w-3" />
                          {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:text-destructive"
                            onClick={() => deleteSlot(slot.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Date Exceptions */}
        <TabsContent value="exceptions" className="space-y-4 pt-4">
          {/* Add exception form */}
          <Card className="border-border/50">
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t('shift.date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-[180px] justify-start text-left font-normal', !excDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {excDate ? format(excDate, 'PPP', { locale: dateLocale }) : t('sched.pick_date')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={excDate} onSelect={setExcDate} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={excAvailable} onCheckedChange={setExcAvailable} />
                  <span className="text-sm">{excAvailable ? t('avail.available') : t('avail.unavailable')}</span>
                </div>
                {excAvailable && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('shift.start_time')}</Label>
                      <Input type="time" value={excStart} onChange={(e) => setExcStart(e.target.value)} className="w-[120px]" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">{t('shift.end_time')}</Label>
                      <Input type="time" value={excEnd} onChange={(e) => setExcEnd(e.target.value)} className="w-[120px]" />
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">{t('avail.reason')}</Label>
                  <Input value={excReason} onChange={(e) => setExcReason(e.target.value)} placeholder={t('avail.reason_placeholder')} />
                </div>
                <Button onClick={addException} size="sm" className="gap-1" disabled={!excDate}>
                  <Plus className="h-4 w-4" />
                  {t('avail.add_exception')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Exceptions list */}
          {exceptions.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">{t('avail.no_exceptions')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {exceptions.map((exc) => (
                <Card key={exc.id} className="border-border/50">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <CalendarDays className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(exc.exception_date), 'PPP', { locale: dateLocale })}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant={exc.is_available ? 'default' : 'destructive'} className="text-[10px]">
                            {exc.is_available ? t('avail.available') : t('avail.unavailable')}
                          </Badge>
                          {exc.is_available && exc.start_time && exc.end_time && (
                            <span className="text-xs text-muted-foreground">
                              {exc.start_time.slice(0, 5)} – {exc.end_time.slice(0, 5)}
                            </span>
                          )}
                          {exc.reason && (
                            <span className="text-xs text-muted-foreground">· {exc.reason}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={() => deleteException(exc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AvailabilityManager;
