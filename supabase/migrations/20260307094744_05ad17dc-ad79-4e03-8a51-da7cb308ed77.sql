
-- Core enums and types
CREATE TYPE public.app_role AS ENUM ('saas_owner', 'client_admin', 'client_manager', 'client_employee');

-- 1. Tenants
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  locale text NOT NULL DEFAULT 'fr-CA',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Invitations
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 5. Contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  start_date date NOT NULL,
  end_date date,
  value numeric,
  description text,
  billing_rate numeric,
  break_rules jsonb NOT NULL DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- 6. Employee Details
CREATE TABLE public.employee_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  hourly_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);
ALTER TABLE public.employee_details ENABLE ROW LEVEL SECURITY;

-- 7. Recurring Availability
CREATE TABLE public.recurring_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recurring_availability ENABLE ROW LEVEL SECURITY;

-- 8. Availability Exceptions
CREATE TABLE public.availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  exception_date date NOT NULL,
  is_available boolean NOT NULL DEFAULT false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.availability_exceptions ENABLE ROW LEVEL SECURITY;

-- 9. Schedules (legacy)
CREATE TABLE public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 10. Schedule Weeks
CREATE TABLE public.schedule_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'locked')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, week_start_date)
);
ALTER TABLE public.schedule_weeks ENABLE ROW LEVEL SECURITY;

-- 11. Shifts
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  schedule_week_id uuid NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  label text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- 12. Shift Assignments
CREATE TABLE public.shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'swapped', 'cancelled')),
  hourly_rate_snapshot numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shift_id, user_id)
);
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- 13. Schedule Publications
CREATE TABLE public.schedule_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  schedule_week_id uuid NOT NULL REFERENCES public.schedule_weeks(id) ON DELETE CASCADE,
  published_by uuid NOT NULL REFERENCES auth.users(id),
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.schedule_publications ENABLE ROW LEVEL SECURITY;

-- 14. Publication Snapshots
CREATE TABLE public.publication_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  publication_id uuid NOT NULL REFERENCES public.schedule_publications(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL,
  user_id uuid NOT NULL,
  start_datetime timestamptz NOT NULL,
  end_datetime timestamptz NOT NULL,
  hourly_rate numeric,
  metadata jsonb DEFAULT '{}'
);
ALTER TABLE public.publication_snapshots ENABLE ROW LEVEL SECURITY;

-- 15. Audit Logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid REFERENCES auth.users(id),
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 16. Tenant Financial Config (NEW)
CREATE TABLE public.tenant_financial_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  employer_costs jsonb NOT NULL DEFAULT '{"rrq":6.4,"rqap":0.494,"cnesst":1.65,"fs":4.26,"ei":2.282,"cpp":5.95,"wsib":1.4,"eht":1.95,"vacation_pay":4.0}',
  overtime_config jsonb NOT NULL DEFAULT '{"threshold_hours":40,"multiplier":1.5}',
  premium_config jsonb NOT NULL DEFAULT '{"evening":1.0,"night":1.5,"weekend":2.0,"holiday":2.5}',
  break_config jsonb NOT NULL DEFAULT '{"paid":true,"duration_minutes":30,"threshold_hours":5}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_financial_config ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT tenant_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.register_organization(_user_id uuid, _org_name text, _full_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _tenant_id uuid;
BEGIN
  INSERT INTO public.tenants (name) VALUES (_org_name) RETURNING id INTO _tenant_id;
  UPDATE public.profiles SET tenant_id = _tenant_id, full_name = _full_name WHERE id = _user_id;
  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _tenant_id, 'client_admin');
END; $$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_user_id uuid, _token text, _full_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _inv record;
BEGIN
  SELECT * INTO _inv FROM public.invitations WHERE token = _token AND accepted_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
  UPDATE public.profiles SET tenant_id = _inv.tenant_id, full_name = _full_name WHERE id = _user_id;
  INSERT INTO public.user_roles (user_id, tenant_id, role) VALUES (_user_id, _inv.tenant_id, _inv.role);
  UPDATE public.invitations SET accepted_at = now() WHERE id = _inv.id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_platform_metrics()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_tenants', (SELECT count(*) FROM public.tenants),
    'active_tenants', (SELECT count(*) FROM public.tenants WHERE status = 'active'),
    'total_users', (SELECT count(*) FROM public.profiles),
    'total_roles', (SELECT count(*) FROM public.user_roles),
    'published_schedules', (SELECT count(*) FROM public.schedule_weeks WHERE status = 'published'),
    'total_shifts', (SELECT count(*) FROM public.shifts)
  )
$$;

-- Profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER set_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_employee_details_updated_at BEFORE UPDATE ON public.employee_details FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_schedules_updated_at BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_schedule_weeks_updated_at BEFORE UPDATE ON public.schedule_weeks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_shifts_updated_at BEFORE UPDATE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_shift_assignments_updated_at BEFORE UPDATE ON public.shift_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_financial_config_updated_at BEFORE UPDATE ON public.tenant_financial_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies

-- Profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_select_tenant" ON public.profiles FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- User Roles
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "roles_select_tenant" ON public.user_roles FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));
CREATE POLICY "roles_admin_update" ON public.user_roles FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));
CREATE POLICY "roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));

-- Tenants
CREATE POLICY "tenants_select_own" ON public.tenants FOR SELECT TO authenticated USING (id = public.get_user_tenant_id());
CREATE POLICY "tenants_saas_select" ON public.tenants FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'saas_owner'));
CREATE POLICY "tenants_saas_insert" ON public.tenants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'saas_owner'));
CREATE POLICY "tenants_saas_update" ON public.tenants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'saas_owner'));
CREATE POLICY "tenants_saas_delete" ON public.tenants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'saas_owner'));

-- Invitations
CREATE POLICY "inv_tenant_select" ON public.invitations FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "inv_public_select_by_token" ON public.invitations FOR SELECT TO anon USING (true);
CREATE POLICY "inv_admin_insert" ON public.invitations FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));
CREATE POLICY "inv_admin_delete" ON public.invitations FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));

-- Contracts
CREATE POLICY "contracts_tenant_select" ON public.contracts FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "contracts_admin_mgr_insert" ON public.contracts FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "contracts_admin_mgr_update" ON public.contracts FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "contracts_admin_delete" ON public.contracts FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));

-- Employee Details
CREATE POLICY "ed_tenant_select" ON public.employee_details FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "ed_own_select" ON public.employee_details FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ed_admin_insert" ON public.employee_details FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));
CREATE POLICY "ed_admin_update" ON public.employee_details FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));

-- Recurring Availability
CREATE POLICY "ra_own_select" ON public.recurring_availability FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ra_tenant_select" ON public.recurring_availability FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "ra_own_insert" ON public.recurring_availability FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "ra_own_delete" ON public.recurring_availability FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Availability Exceptions
CREATE POLICY "ae_own_select" ON public.availability_exceptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "ae_tenant_select" ON public.availability_exceptions FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "ae_own_insert" ON public.availability_exceptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "ae_own_delete" ON public.availability_exceptions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Schedules (legacy)
CREATE POLICY "sched_tenant_select" ON public.schedules FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "sched_admin_mgr_insert" ON public.schedules FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "sched_admin_mgr_update" ON public.schedules FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "sched_admin_delete" ON public.schedules FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));

-- Schedule Weeks
CREATE POLICY "sw_tenant_select" ON public.schedule_weeks FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "sw_admin_mgr_insert" ON public.schedule_weeks FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "sw_admin_mgr_update" ON public.schedule_weeks FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "sw_admin_delete" ON public.schedule_weeks FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));

-- Shifts
CREATE POLICY "shifts_tenant_select" ON public.shifts FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "shifts_admin_mgr_insert" ON public.shifts FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "shifts_admin_mgr_update" ON public.shifts FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "shifts_admin_mgr_delete" ON public.shifts FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));

-- Shift Assignments
CREATE POLICY "sa_tenant_select" ON public.shift_assignments FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "sa_admin_mgr_insert" ON public.shift_assignments FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "sa_admin_mgr_update" ON public.shift_assignments FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));
CREATE POLICY "sa_admin_mgr_delete" ON public.shift_assignments FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));

-- Schedule Publications
CREATE POLICY "sp_tenant_select" ON public.schedule_publications FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "sp_admin_mgr_insert" ON public.schedule_publications FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));

-- Publication Snapshots
CREATE POLICY "ps_tenant_select" ON public.publication_snapshots FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "ps_admin_mgr_insert" ON public.publication_snapshots FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND (public.has_role(auth.uid(), 'client_admin') OR public.has_role(auth.uid(), 'client_manager')));

-- Audit Logs
CREATE POLICY "al_tenant_select" ON public.audit_logs FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "al_auth_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id());

-- Tenant Financial Config
CREATE POLICY "tfc_tenant_select" ON public.tenant_financial_config FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "tfc_admin_insert" ON public.tenant_financial_config FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));
CREATE POLICY "tfc_admin_update" ON public.tenant_financial_config FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id() AND public.has_role(auth.uid(), 'client_admin'));

-- Performance indexes
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX idx_invitations_tenant ON public.invitations(tenant_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_contracts_tenant ON public.contracts(tenant_id);
CREATE INDEX idx_employee_details_tenant ON public.employee_details(tenant_id);
CREATE INDEX idx_employee_details_user ON public.employee_details(user_id);
CREATE INDEX idx_recurring_avail_user ON public.recurring_availability(user_id);
CREATE INDEX idx_avail_exceptions_user ON public.availability_exceptions(user_id);
CREATE INDEX idx_schedule_weeks_tenant ON public.schedule_weeks(tenant_id);
CREATE INDEX idx_schedule_weeks_date ON public.schedule_weeks(week_start_date);
CREATE INDEX idx_shifts_week ON public.shifts(schedule_week_id);
CREATE INDEX idx_shifts_tenant ON public.shifts(tenant_id);
CREATE INDEX idx_shift_assignments_shift ON public.shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_user ON public.shift_assignments(user_id);
CREATE INDEX idx_shift_assignments_tenant ON public.shift_assignments(tenant_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_publications_week ON public.schedule_publications(schedule_week_id);
CREATE INDEX idx_financial_config_tenant ON public.tenant_financial_config(tenant_id);
