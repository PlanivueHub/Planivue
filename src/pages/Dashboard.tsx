import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CalendarDays, Shield } from 'lucide-react';

const Dashboard = () => {
  const { profile, highestRole } = useAuth();
  const { t } = useLanguage();
  const role = highestRole();

  const roleLabel = role ? t(`role.${role}` as any) : '';

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">
          {t('dashboard.welcome')}, {profile?.full_name || ''}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t('dashboard.overview')} — <span className="text-primary font-medium">{roleLabel}</span>
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Building2, label: t('nav.contracts'), value: '—' },
          { icon: Users, label: t('nav.team'), value: '—' },
          { icon: CalendarDays, label: t('nav.schedules'), value: '—' },
          { icon: Shield, label: t('nav.settings'), value: '—' },
        ].map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50">
        <CardContent className="flex h-48 items-center justify-center text-muted-foreground">
          {t('dashboard.overview')} — {t('common.loading')}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
