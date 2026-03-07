import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { EmployerCostPercents, OvertimeConfig, PremiumConfig, BreakConfig } from '@/types/financials';

const DEFAULT_EMPLOYER_COSTS: EmployerCostPercents = {
  rrq: 6.4, rqap: 0.494, cnesst: 1.65, fs: 4.26,
  ei: 2.282, cpp: 5.95, wsib: 1.4, eht: 1.95, vacation_pay: 4.0,
};

const DEFAULT_OVERTIME: OvertimeConfig = { threshold_hours: 40, multiplier: 1.5 };
const DEFAULT_PREMIUMS: PremiumConfig = { evening: 1.0, night: 1.5, weekend: 2.0, holiday: 2.5 };
const DEFAULT_BREAKS: BreakConfig = { paid: true, duration_minutes: 30, threshold_hours: 5 };

export function useFinancialConfig() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [employerCosts, setEmployerCosts] = useState<EmployerCostPercents>(DEFAULT_EMPLOYER_COSTS);
  const [overtime, setOvertime] = useState<OvertimeConfig>(DEFAULT_OVERTIME);
  const [premiums, setPremiums] = useState<PremiumConfig>(DEFAULT_PREMIUMS);
  const [breaks, setBreaks] = useState<BreakConfig>(DEFAULT_BREAKS);
  const [loading, setLoading] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load config
  useEffect(() => {
    if (!tenantId) return;
    (async () => {
      const { data, error } = await supabase
        .from('tenant_financial_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (data) {
        setConfigId(data.id);
        setEmployerCosts(data.employer_costs as unknown as EmployerCostPercents);
        setOvertime(data.overtime_config as unknown as OvertimeConfig);
        setPremiums(data.premium_config as unknown as PremiumConfig);
        setBreaks(data.break_config as unknown as BreakConfig);
      }
      if (error) console.error('Failed to load financial config:', error);
      setLoading(false);
    })();
  }, [tenantId]);

  // Debounced save
  const persist = useCallback((
    ec: EmployerCostPercents, ot: OvertimeConfig, pr: PremiumConfig, br: BreakConfig
  ) => {
    if (!tenantId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const payload = {
        tenant_id: tenantId,
        employer_costs: ec as unknown as Record<string, unknown>,
        overtime_config: ot as unknown as Record<string, unknown>,
        premium_config: pr as unknown as Record<string, unknown>,
        break_config: br as unknown as Record<string, unknown>,
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
          .insert(payload)
          .select('id')
          .single();
        error = res.error;
        if (res.data) setConfigId(res.data.id);
      }

      if (error) {
        console.error('Save failed:', error);
        toast.error('Failed to save financial config');
      }
    }, 800);
  }, [tenantId, configId]);

  const updateEmployerCosts = useCallback((v: EmployerCostPercents) => {
    setEmployerCosts(v);
    persist(v, overtime, premiums, breaks);
  }, [persist, overtime, premiums, breaks]);

  const updateOvertime = useCallback((v: OvertimeConfig) => {
    setOvertime(v);
    persist(employerCosts, v, premiums, breaks);
  }, [persist, employerCosts, premiums, breaks]);

  const updatePremiums = useCallback((v: PremiumConfig) => {
    setPremiums(v);
    persist(employerCosts, overtime, v, breaks);
  }, [persist, employerCosts, overtime, breaks]);

  const updateBreaks = useCallback((v: BreakConfig) => {
    setBreaks(v);
    persist(employerCosts, overtime, premiums, v);
  }, [persist, employerCosts, overtime, premiums]);

  return {
    employerCosts, overtime, premiums, breaks, loading,
    setEmployerCosts: updateEmployerCosts,
    setOvertime: updateOvertime,
    setPremiums: updatePremiums,
    setBreaks: updateBreaks,
  };
}
