import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Settings2, BarChart3, Table2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import EmployerCostConfig from '@/components/financials/EmployerCostConfig';
import FinancialCalculationEngine from '@/components/financials/FinancialCalculationEngine';
import ComparativeAnalysis from '@/components/financials/ComparativeAnalysis';
import PremiumOvertimeConfig from '@/components/financials/PremiumOvertimeConfig';
import FinancialShiftTable from '@/components/financials/FinancialShiftTable';
import type { EmployerCostPercents, OvertimeConfig, PremiumConfig, BreakConfig } from '@/types/financials';

const DEFAULT_EMPLOYER_COSTS: EmployerCostPercents = {
  rrq: 6.4, rqap: 0.494, cnesst: 1.65, fs: 4.26,
  ei: 2.282, cpp: 5.95, wsib: 1.4, eht: 1.95, vacation_pay: 4.0,
};
const DEFAULT_OVERTIME: OvertimeConfig = { threshold_hours: 40, multiplier: 1.5 };
const DEFAULT_PREMIUMS: PremiumConfig = { evening: 1.0, night: 1.5, weekend: 2.0, holiday: 2.5 };
const DEFAULT_BREAKS: BreakConfig = { paid: true, duration_minutes: 30, threshold_hours: 5 };

const FinancialsPage = () => {
  const { t } = useLanguage();
  const { profile } = useAuth();

  const [employerCosts, setEmployerCosts] = useState<EmployerCostPercents>(DEFAULT_EMPLOYER_COSTS);
  const [overtime, setOvertime] = useState<OvertimeConfig>(DEFAULT_OVERTIME);
  const [premiums, setPremiums] = useState<PremiumConfig>(DEFAULT_PREMIUMS);
  const [breaks, setBreaks] = useState<BreakConfig>(DEFAULT_BREAKS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const totalEmployerPct = Object.values(employerCosts).reduce((a, b) => a + b, 0);

  // Load config from DB
  const loadConfig = useCallback(async () => {
    if (!profile?.tenant_id) return;
    const { data } = await supabase
      .from('tenant_financial_config')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (data) {
      setConfigId(data.id);
      const ec = data.employer_costs as any;
      const ot = data.overtime_config as any;
      const pr = data.premium_config as any;
      const br = data.break_config as any;
      if (ec) setEmployerCosts(ec);
      if (ot) setOvertime(ot);
      if (pr) setPremiums(pr);
      if (br) setBreaks(br);
    }
    setLoaded(true);
  }, [profile?.tenant_id]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Save config to DB
  const saveConfig = async () => {
    if (!profile?.tenant_id) return;
    setSaving(true);

    const payload = {
      tenant_id: profile.tenant_id,
      employer_costs: employerCosts as any,
      overtime_config: overtime as any,
      premium_config: premiums as any,
      break_config: breaks as any,
    };

    let error;
    if (configId) {
      ({ error } = await supabase
        .from('tenant_financial_config')
        .update(payload)
        .eq('id', configId));
    } else {
      const res = await supabase
        .from('tenant_financial_config')
        .insert(payload as any)
        .select('id')
        .single();
      error = res.error;
      if (res.data) setConfigId(res.data.id);
    }

    if (error) toast.error(error.message);
    else toast.success(t('common.save') + ' ✓');
    setSaving(false);
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('fin.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('fin.subtitle')}</p>
        </div>
        <Button onClick={saveConfig} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" />
          {saving ? t('common.loading') : t('common.save')}
        </Button>
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
