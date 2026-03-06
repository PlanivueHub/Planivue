import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Users, CalendarDays, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  type: 'contract' | 'schedule' | 'team';
  title: string;
  subtitle: string;
  timestamp: string;
  isNew: boolean;
}

interface RecentActivityFeedProps {
  tenantId: string;
}

const ICON_MAP = {
  contract: FileText,
  schedule: CalendarDays,
  team: Users,
};

const COLOR_MAP = {
  contract: 'text-primary',
  schedule: 'text-violet-500',
  team: 'text-blue-500',
};

const BG_MAP = {
  contract: 'bg-primary/10',
  schedule: 'bg-violet-500/10',
  team: 'bg-blue-500/10',
};

const RecentActivityFeed = ({ tenantId }: RecentActivityFeedProps) => {
  const { t, language } = useLanguage();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const dateLocale = language === 'fr' ? frLocale : enCA;

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);

      const [contractsRes, schedulesRes, profilesRes] = await Promise.all([
        supabase
          .from('contracts')
          .select('id, title, client_name, status, updated_at, created_at')
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('schedules')
          .select('id, title, status, updated_at, created_at')
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('profiles')
          .select('id, full_name, created_at, updated_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const items: ActivityItem[] = [];

      contractsRes.data?.forEach((c) => {
        const isUpdate = c.updated_at !== c.created_at;
        items.push({
          id: `contract-${c.id}`,
          type: 'contract',
          title: c.title,
          subtitle: isUpdate
            ? `${t('dashboard.activity_updated')} · ${c.client_name}`
            : `${t('dashboard.activity_created')} · ${c.client_name}`,
          timestamp: c.updated_at,
          isNew: new Date(c.updated_at) > dayAgo,
        });
      });

      schedulesRes.data?.forEach((s) => {
        const isUpdate = s.updated_at !== s.created_at;
        items.push({
          id: `schedule-${s.id}`,
          type: 'schedule',
          title: s.title,
          subtitle: isUpdate
            ? `${t('dashboard.activity_updated')} · ${t(`sched.status_${s.status}` as any)}`
            : `${t('dashboard.activity_created')} · ${t(`sched.status_${s.status}` as any)}`,
          timestamp: s.updated_at,
          isNew: new Date(s.updated_at) > dayAgo,
        });
      });

      profilesRes.data?.forEach((p) => {
        items.push({
          id: `team-${p.id}`,
          type: 'team',
          title: p.full_name || t('dashboard.activity_unknown_member'),
          subtitle: t('dashboard.activity_joined'),
          timestamp: p.created_at,
          isNew: new Date(p.created_at) > dayAgo,
        });
      });

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items.slice(0, 10));
      setLoading(false);
    };

    fetchActivity();
  }, [tenantId, t]);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          {t('dashboard.recent_activity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-9 w-9 rounded-lg bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-2/3 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t('dashboard.no_activity')}
          </p>
        ) : (
          <ScrollArea className="h-[320px] pr-3">
            <div className="space-y-3">
              {activities.map((item) => {
                const Icon = ICON_MAP[item.type];
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${BG_MAP[item.type]}`}>
                      <Icon className={`h-4 w-4 ${COLOR_MAP[item.type]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.isNew && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {t('dashboard.activity_new')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityFeed;
