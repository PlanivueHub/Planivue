import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clock, Moon, Sun, CalendarCheck, Coffee } from 'lucide-react';
import type { OvertimeConfig, PremiumConfig, BreakConfig } from '@/types/financials';

interface Props {
  overtime: OvertimeConfig;
  onOvertimeChange: (v: OvertimeConfig) => void;
  premiums: PremiumConfig;
  onPremiumsChange: (v: PremiumConfig) => void;
  breaks: BreakConfig;
  onBreaksChange: (v: BreakConfig) => void;
}

const PremiumOvertimeConfig = ({
  overtime, onOvertimeChange,
  premiums, onPremiumsChange,
  breaks, onBreaksChange,
}: Props) => {
  const { t } = useLanguage();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Overtime */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {t('fin.overtime_config')}
          </CardTitle>
          <CardDescription>{t('fin.overtime_config_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t('fin.ot_threshold')}</Label>
            <div className="relative">
              <Input
                type="number" step="0.5" min="0"
                value={overtime.threshold_hours}
                onChange={(e) => onOvertimeChange({ ...overtime, threshold_hours: +e.target.value })}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('fin.ot_multiplier')}</Label>
            <div className="relative">
              <Input
                type="number" step="0.1" min="1"
                value={overtime.multiplier}
                onChange={(e) => onOvertimeChange({ ...overtime, multiplier: +e.target.value })}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">×</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premiums */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Moon className="h-4 w-4 text-primary" />
            {t('fin.premiums_config')}
          </CardTitle>
          <CardDescription>{t('fin.premiums_config_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { key: 'evening' as const, icon: Sun, label: t('fin.prem_evening') },
              { key: 'night' as const, icon: Moon, label: t('fin.prem_night') },
              { key: 'weekend' as const, icon: CalendarCheck, label: t('fin.prem_weekend') },
              { key: 'holiday' as const, icon: CalendarCheck, label: t('fin.prem_holiday') },
            ]).map(({ key, icon: Icon, label }) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs flex items-center gap-1.5">
                  <Icon className="h-3 w-3" /> {label}
                </Label>
                <div className="relative">
                  <Input
                    type="number" step="0.25" min="0"
                    value={premiums[key]}
                    onChange={(e) => onPremiumsChange({ ...premiums, [key]: +e.target.value })}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$/h</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Break Rules */}
      <Card className="border-border/50 lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Coffee className="h-4 w-4 text-primary" />
            {t('fin.break_config')}
          </CardTitle>
          <CardDescription>{t('fin.break_config_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={breaks.paid} onCheckedChange={(v) => onBreaksChange({ ...breaks, paid: v })} />
              <div>
                <span className="text-sm font-medium">{breaks.paid ? t('fin.break_paid') : t('fin.break_unpaid')}</span>
                <p className="text-[10px] text-muted-foreground">
                  {breaks.paid ? t('fin.break_paid_desc') : t('fin.break_unpaid_desc')}
                </p>
              </div>
              <Badge variant={breaks.paid ? 'default' : 'destructive'} className="text-[10px]">
                {breaks.paid ? t('fin.hours_counted') : t('fin.time_deducted')}
              </Badge>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('fin.break_duration')}</Label>
              <div className="relative">
                <Input
                  type="number" min="0"
                  value={breaks.duration_minutes}
                  onChange={(e) => onBreaksChange({ ...breaks, duration_minutes: +e.target.value })}
                  className="w-[100px] pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('fin.break_threshold')}</Label>
              <div className="relative">
                <Input
                  type="number" step="0.5" min="0"
                  value={breaks.threshold_hours}
                  onChange={(e) => onBreaksChange({ ...breaks, threshold_hours: +e.target.value })}
                  className="w-[100px] pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PremiumOvertimeConfig;
