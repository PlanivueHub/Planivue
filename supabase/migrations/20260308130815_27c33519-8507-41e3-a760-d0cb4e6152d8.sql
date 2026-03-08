
-- ================================================================
-- 1. user_roles: Drop any open INSERT policy, enforce strict one
-- ================================================================
DROP POLICY IF EXISTS "Anyone can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "roles_admin_insert" ON public.user_roles;

CREATE POLICY "roles_admin_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id = get_user_tenant_id())
    AND has_role(auth.uid(), 'client_admin'::app_role)
  );

-- ================================================================
-- 2. tenants: Drop any open INSERT policy, enforce saas_owner only
-- ================================================================
DROP POLICY IF EXISTS "Anyone can insert tenant" ON public.tenants;
DROP POLICY IF EXISTS "tenants_saas_insert" ON public.tenants;

CREATE POLICY "tenants_saas_insert" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'saas_owner'::app_role)
  );

-- ================================================================
-- 3. invitations: Replace any ALL policy with explicit WITH CHECK
-- ================================================================
DROP POLICY IF EXISTS "inv_admin_manage" ON public.invitations;
DROP POLICY IF EXISTS "inv_admin_insert" ON public.invitations;
DROP POLICY IF EXISTS "inv_admin_delete" ON public.invitations;

CREATE POLICY "inv_admin_insert" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    (tenant_id = get_user_tenant_id())
    AND has_role(auth.uid(), 'client_admin'::app_role)
  );

CREATE POLICY "inv_admin_delete" ON public.invitations
  FOR DELETE TO authenticated
  USING (
    (tenant_id = get_user_tenant_id())
    AND has_role(auth.uid(), 'client_admin'::app_role)
  );
