import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, User, Mail, Lock, Eye, EyeOff, Building2 } from 'lucide-react';
import LanguageToggle from '@/components/layout/LanguageToggle';
import ThemeToggle from '@/components/layout/ThemeToggle';

const Register = () => {
  const { signUp, user, loading } = useAuth();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('auth.loading')}</p>
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (success || submitting) return;
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.password') + ' mismatch');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUp(email, password, fullName, orgName);
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setSuccess(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Top-right controls */}
      <div className="absolute right-6 top-6 flex items-center gap-1">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md">
        {success ? (
          <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-xl">
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 className="h-14 w-14 text-success" />
              <h2 className="font-display text-2xl font-bold text-card-foreground">{t('dashboard.welcome')} !</h2>
              <p className="text-center text-muted-foreground">
                {t('auth.register_subtitle')}
              </p>
              <Link to="/login">
                <Button>{t('auth.login_btn')}</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-xl">
            {/* Header */}
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-card-foreground">
                {t('auth.welcome_back')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('auth.register_subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-card-foreground">{t('auth.full_name')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="John Alley"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-card-foreground">{t('auth.org_name')}</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="orgName"
                    placeholder="Acme Inc."
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-card-foreground">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-card-foreground">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-card-foreground">{t('auth.confirm_password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={submitting}>
                {submitting ? t('auth.loading') : t('auth.register_btn')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('auth.has_account')}{' '}
                <Link to="/login" className="font-medium text-primary hover:underline">
                  {t('auth.login')}
                </Link>
              </p>

              <p className="text-center text-xs text-muted-foreground/70">
                {t('auth.employee_notice')}
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
