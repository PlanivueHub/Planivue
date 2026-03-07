import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Search, Plus, Send, RotateCcw } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { ScheduleWeek } from '@/types/database';

interface ScheduleToolbarProps {
  currentWeekStart: Date;
  onNavigateWeek: (dir: -1 | 1) => void;
  search: string;
  onSearchChange: (v: string) => void;
  scheduleWeek: ScheduleWeek | null;
  onCreateWeek: () => void;
  onPublishWeek?: () => void;
  onRevertToDraft?: () => void;
  publishing?: boolean;
}

const ScheduleToolbar = ({
  currentWeekStart,
  onNavigateWeek,
  search,
  onSearchChange,
  scheduleWeek,
  onCreateWeek,
  onPublishWeek,
  publishing,
}: ScheduleToolbarProps) => {
  const { t, language } = useLanguage();
  const dateLocale = language === 'fr' ? frLocale : enCA;
  const weekEnd = addDays(currentWeekStart, 6);

  const statusConfig: Record<string, { variant: 'secondary' | 'default' | 'destructive'; label: string }> = {
    draft: { variant: 'secondary', label: t('sched.status_draft') },
    published: { variant: 'default', label: t('sched.status_published') },
    locked: { variant: 'destructive', label: t('sched.status_locked' as any) },
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Week nav + status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[200px] text-center text-sm font-semibold">
            {format(currentWeekStart, 'MMM d', { locale: dateLocale })} – {format(weekEnd, 'MMM d, yyyy', { locale: dateLocale })}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {scheduleWeek && (
          <Badge variant={statusConfig[scheduleWeek.status]?.variant ?? 'secondary'}>
            {statusConfig[scheduleWeek.status]?.label ?? scheduleWeek.status}
          </Badge>
        )}
      </div>

      {/* Right: Search + Create */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-48 pl-9"
          />
        </div>
        {!scheduleWeek && (
          <Button onClick={onCreateWeek} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('sched.create_schedule')}
          </Button>
        )}
        {scheduleWeek?.status === 'draft' && onPublishWeek && (
          <Button onClick={onPublishWeek} disabled={publishing} className="gap-2">
            <Send className="h-4 w-4" />
            {publishing ? t('common.loading') : t('sched.publish')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ScheduleToolbar;
