import { useEffect, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import LanguageToggle from '@/components/layout/LanguageToggle';
import ThemeToggle from '@/components/layout/ThemeToggle';
import type { Invitation } from '@/types/database';

const AcceptInvitation = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useLanguage();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'done'>('loading');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) { setStatus('invalid'); return; }

      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !data) { setStatus('invalid'); return; }

      const inv = data as Invitation;
      setInvitation(inv);

      if (inv.accepted_at) { setStatus('accepted'); return; }
      if (new Date(inv.expires_at) < new Date()) { setStatus('expired'); return; }

      // Fetch tenant name
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', inv.tenant_id)
        .single();
      if (tenant) setTenantName(tenant.name);

      setStatus('valid');
    };

    fetchInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!invitation) return;

    setSubmitting(true);
    try {
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError) { setError(authError.message); setSubmitting(false); return; }
      if (!authData.user) { setError('User creation failed'); setSubmitting(false); return; }

      const userId = authData.user.id;

      // Update profile with tenant
      await supabase
        .from('profiles')
        .update({ tenant_id: invitation.tenant_id, full_name: fullName })
        .eq('id', userId);

      // Assign role
      await supabase
        .from('user_roles')
        .insert({ user_id: userId, tenant_id: invitation.tenant_id, role: invitation.role });

      // Mark invitation as accepted
      await supabase
        .from('invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
    setSubmitting(false);
  };

  const renderContent = () => {
    if (status === 'loading') {
      return <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>;
    }

    if (status === 'invalid' || status === 'expired') {
      return (
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-center font-medium">
              {status === 'expired' ? t('inv.expired') : t('inv.invalid_token')}
            </p>
            <Link to="/login">
              <Button variant="outline">{t('auth.login')}</Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    if (status === 'accepted') {
      return (
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <p className="text-center font-medium">{t('inv.already_accepted')}</p>
            <Link to="/login">
              <Button>{t('auth.login')}</Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    if (status === 'done') {
      return (
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <p className="text-center text-lg font-semibold">{t('dashboard.welcome')} !</p>
            <Link to="/login">
              <Button>{t('auth.login')}</Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    // status === 'valid'
    return (
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <UserCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">{t('inv.accept_title')}</CardTitle>
          <CardDescription>
            {t('inv.accept_subtitle')}
            {tenantName && (
              <span className="mt-1 block font-semibold text-foreground">{tenantName}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('auth.email')}</Label>
              <Input value={invitation?.email ?? ''} disabled />
            </div>

            <div className="space-y-2">
              <Label>{t('auth.full_name')}</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>{t('auth.password')}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>

            <div className="space-y-2">
              <Label>{t('auth.confirm_password')}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t('common.loading') : t('inv.accept_btn')}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="absolute right-6 top-6 flex items-center gap-1">
        <ThemeToggle />
        <LanguageToggle />
      </div>
      {renderContent()}
    </div>
  );
};

export default AcceptInvitation;
