import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { useLanguage } from '@/i18n/LanguageContext';
import { fr as frLocale, enCA } from 'date-fns/locale';

interface WeekNavigatorProps {
  currentWeekStart: Date;
  onNavigate: (dir: -1 | 1) => void;
}

const WeekNavigator = ({ currentWeekStart, onNavigate }: WeekNavigatorProps) => {
  const { language } = useLanguage();
  const dateLocale = language === 'fr' ? frLocale : enCA;
  const weekEnd = addDays(currentWeekStart, 6);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[200px] text-center text-sm font-semibold">
        {format(currentWeekStart, 'MMM d', { locale: dateLocale })} – {format(weekEnd, 'MMM d, yyyy', { locale: dateLocale })}
      </span>
      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onNavigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default WeekNavigator;
