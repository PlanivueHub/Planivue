
CREATE TABLE IF NOT EXISTS public.tenant_financial_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employer_costs jsonb NOT NULL DEFAULT '{"ei": 2.282, "fs": 4.26, "cpp": 5.95, "eht": 1.95, "rrq": 6.4, "rqap": 0.494, "wsib": 1.4, "cnesst": 1.65, "vacation_pay": 4.0}'::jsonb,
  overtime_config jsonb NOT NULL DEFAULT '{"multiplier": 1.5, "threshold_hours": 40}'::jsonb,
  premium_config jsonb NOT NULL DEFAULT '{"night": 1.5, "evening": 1.0, "holiday": 2.5, "weekend": 2.0}'::jsonb,
  break_config jsonb NOT NULL DEFAULT '{"paid": true, "threshold_hours": 5, "duration_minutes": 30}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.tenant_financial_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tfc_admin_insert" ON public.tenant_financial_config;
DROP POLICY IF EXISTS "tfc_admin_update" ON public.tenant_financial_config;
DROP POLICY IF EXISTS "tfc_tenant_select" ON public.tenant_financial_config;

CREATE POLICY "tfc_tenant_select" ON public.tenant_financial_config
  FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tfc_admin_insert" ON public.tenant_financial_config
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'client_admin'::app_role));

CREATE POLICY "tfc_admin_update" ON public.tenant_financial_config
  FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'client_admin'::app_role));

CREATE OR REPLACE FUNCTION public.delete_tenant_cascade(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'saas_owner') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.publication_snapshots WHERE tenant_id = _tenant_id;
  DELETE FROM public.schedule_publications WHERE tenant_id = _tenant_id;
  DELETE FROM public.shift_assignments WHERE tenant_id = _tenant_id;
  DELETE FROM public.shifts WHERE tenant_id = _tenant_id;
  DELETE FROM public.schedule_weeks WHERE tenant_id = _tenant_id;
  DELETE FROM public.schedules WHERE tenant_id = _tenant_id;
  DELETE FROM public.contracts WHERE tenant_id = _tenant_id;
  DELETE FROM public.tenant_financial_config WHERE tenant_id = _tenant_id;
  DELETE FROM public.employee_details WHERE tenant_id = _tenant_id;
  DELETE FROM public.recurring_availability WHERE tenant_id = _tenant_id;
  DELETE FROM public.availability_exceptions WHERE tenant_id = _tenant_id;
  DELETE FROM public.invitations WHERE tenant_id = _tenant_id;
  DELETE FROM public.audit_logs WHERE tenant_id = _tenant_id;
  DELETE FROM public.user_roles WHERE tenant_id = _tenant_id;
  DELETE FROM public.profiles WHERE tenant_id = _tenant_id;
  DELETE FROM public.tenants WHERE id = _tenant_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';
