import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

/**
 * Redirects authenticated users to the correct dashboard based on their highest role.
 */
const RoleRedirect = () => {
  const { user, loading, hasRole } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (hasRole('saas_owner')) return <Navigate to="/saas-dashboard" replace />;
  if (hasRole('client_admin') || hasRole('client_manager')) return <Navigate to="/dashboard" replace />;
  if (hasRole('client_employee')) return <Navigate to="/employee-dashboard" replace />;

  // Fallback
  return <Navigate to="/dashboard" replace />;
};

export default RoleRedirect;
