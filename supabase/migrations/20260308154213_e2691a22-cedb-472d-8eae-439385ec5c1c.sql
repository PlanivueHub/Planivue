-- Add unique constraint to prevent duplicate pending invitations per tenant+email
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
  ON public.invitations (tenant_id, email)
  WHERE accepted_at IS NULL;