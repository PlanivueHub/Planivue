import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Landmark } from 'lucide-react';
import type { EmployerCostPercents } from '@/types/financials';

interface Props {
  costs: EmployerCostPercents;
  onChange: (costs: EmployerCostPercents) => void;
}

const COST_KEYS: { key: keyof EmployerCostPercents; label: string; desc_en: string; desc_fr: string }[] = [
  { key: 'rrq', label: 'RRQ', desc_en: 'Régime de rentes du Québec', desc_fr: 'Régime de rentes du Québec' },
  { key: 'rqap', label: 'RQAP', desc_en: 'Québec Parental Insurance', desc_fr: 'Régime québécois d\'assurance parentale' },
  { key: 'cnesst', label: 'CNESST', desc_en: 'Workplace Safety & Insurance', desc_fr: 'Santé et sécurité au travail' },
  { key: 'fs', label: 'FS', desc_en: 'Health Services Fund', desc_fr: 'Fonds des services de santé' },
  { key: 'ei', label: 'EI', desc_en: 'Employment Insurance', desc_fr: 'Assurance-emploi' },
  { key: 'cpp', label: 'CPP', desc_en: 'Canada Pension Plan', desc_fr: 'Régime de pensions du Canada' },
  { key: 'wsib', label: 'WSIB', desc_en: 'Workplace Safety (ON)', desc_fr: 'Sécurité au travail (ON)' },
  { key: 'eht', label: 'EHT', desc_en: 'Employer Health Tax', desc_fr: 'Contribution-santé employeur' },
  { key: 'vacation_pay', label: 'Vacation', desc_en: 'Vacation Pay', desc_fr: 'Paie de vacances' },
];

const EmployerCostConfig = ({ costs, onChange }: Props) => {
  const { t, language } = useLanguage();
  const total = Object.values(costs).reduce((a, b) => a + b, 0);

  const update = (key: keyof EmployerCostPercents, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onChange({ ...costs, [key]: num });
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" />
          {t('fin.employer_costs')}
        </CardTitle>
        <CardDescription>{t('fin.employer_costs_desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COST_KEYS.map(({ key, label, desc_en, desc_fr }) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{label}</Label>
                <span className="text-[10px] text-muted-foreground">
                  {language === 'fr' ? desc_fr : desc_en}
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costs[key]}
                  onChange={(e) => update(key, e.target.value)}
                  className="pr-8 text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/5 p-3">
          <span className="text-sm font-medium">{t('fin.total_employer_pct')}</span>
          <Badge variant="default" className="text-sm font-bold">{total.toFixed(2)}%</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployerCostConfig;
