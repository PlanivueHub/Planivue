import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { LayoutDashboard } from 'lucide-react';
import WeeklyHoursOverview from '@/components/dashboard/WeeklyHoursOverview';

const EmployeeDashboard = () => {
  const { profile } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="font-display text-3xl font-bold">
            {t('dashboard.welcome')}, {profile?.full_name || ''}
          </h1>
        </div>
        <p className="mt-1 text-muted-foreground">{t('emp.subtitle')}</p>
      </div>

      <WeeklyHoursOverview />
    </div>
  );
};

export default EmployeeDashboard;
