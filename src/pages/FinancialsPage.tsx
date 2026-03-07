import { useLanguage } from '@/i18n/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Settings2, BarChart3, Table2 } from 'lucide-react';
import EmployerCostConfig from '@/components/financials/EmployerCostConfig';
import FinancialCalculationEngine from '@/components/financials/FinancialCalculationEngine';
import ComparativeAnalysis from '@/components/financials/ComparativeAnalysis';
import PremiumOvertimeConfig from '@/components/financials/PremiumOvertimeConfig';
import FinancialShiftTable from '@/components/financials/FinancialShiftTable';
import { useState } from 'react';
import type { EmployerCostPercents, OvertimeConfig, PremiumConfig, BreakConfig } from '@/types/financials';

const DEFAULT_EMPLOYER_COSTS: EmployerCostPercents = {
  rrq: 6.4,
  rqap: 0.494,
  cnesst: 1.65,
  fs: 4.26,
  ei: 2.282,
  cpp: 5.95,
  wsib: 1.4,
  eht: 1.95,
  vacation_pay: 4.0,
};

const DEFAULT_OVERTIME: OvertimeConfig = {
  threshold_hours: 40,
  multiplier: 1.5,
};

const DEFAULT_PREMIUMS: PremiumConfig = {
  evening: 1.0,
  night: 1.5,
  weekend: 2.0,
  holiday: 2.5,
};

const DEFAULT_BREAKS: BreakConfig = {
  paid: true,
  duration_minutes: 30,
  threshold_hours: 5,
};

const FinancialsPage = () => {
  const { t } = useLanguage();

  const [employerCosts, setEmployerCosts] = useState<EmployerCostPercents>(DEFAULT_EMPLOYER_COSTS);
  const [overtime, setOvertime] = useState<OvertimeConfig>(DEFAULT_OVERTIME);
  const [premiums, setPremiums] = useState<PremiumConfig>(DEFAULT_PREMIUMS);
  const [breaks, setBreaks] = useState<BreakConfig>(DEFAULT_BREAKS);

  const totalEmployerPct = Object.values(employerCosts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t('fin.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('fin.subtitle')}</p>
      </div>

      <Tabs defaultValue="engine" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="engine" className="gap-1.5 text-xs">
            <Calculator className="h-3.5 w-3.5" />
            {t('fin.tab_engine')}
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" />
            {t('fin.tab_scenarios')}
          </TabsTrigger>
          <TabsTrigger value="shifts" className="gap-1.5 text-xs">
            <Table2 className="h-3.5 w-3.5" />
            {t('fin.tab_shifts')}
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" />
            {t('fin.tab_config')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="engine" className="space-y-6">
          <FinancialCalculationEngine
            employerCostPct={totalEmployerPct}
            overtime={overtime}
            premiums={premiums}
            breaks={breaks}
          />
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <ComparativeAnalysis
            employerCostPct={totalEmployerPct}
            overtime={overtime}
            premiums={premiums}
          />
        </TabsContent>

        <TabsContent value="shifts" className="space-y-6">
          <FinancialShiftTable
            employerCostPct={totalEmployerPct}
            overtime={overtime}
            premiums={premiums}
            breaks={breaks}
          />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <EmployerCostConfig costs={employerCosts} onChange={setEmployerCosts} />
          <PremiumOvertimeConfig
            overtime={overtime}
            onOvertimeChange={setOvertime}
            premiums={premiums}
            onPremiumsChange={setPremiums}
            breaks={breaks}
            onBreaksChange={setBreaks}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialsPage;
