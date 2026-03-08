
CREATE OR REPLACE FUNCTION public.delete_tenant_cascade(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller is saas_owner
  IF NOT has_role(auth.uid(), 'saas_owner') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Delete in dependency order
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
$$;
