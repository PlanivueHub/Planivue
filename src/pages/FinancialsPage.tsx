import { useLanguage } from '@/i18n/LanguageContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Settings2, BarChart3, Table2, Loader2 } from 'lucide-react';
import EmployerCostConfig from '@/components/financials/EmployerCostConfig';
import FinancialCalculationEngine from '@/components/financials/FinancialCalculationEngine';
import ComparativeAnalysis from '@/components/financials/ComparativeAnalysis';
import PremiumOvertimeConfig from '@/components/financials/PremiumOvertimeConfig';
import FinancialShiftTable from '@/components/financials/FinancialShiftTable';
import { useFinancialConfig } from '@/hooks/useFinancialConfig';

const FinancialsPage = () => {
  const { t } = useLanguage();
  const {
    employerCosts, overtime, premiums, breaks, loading,
    setEmployerCosts, setOvertime, setPremiums, setBreaks,
  } = useFinancialConfig();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
