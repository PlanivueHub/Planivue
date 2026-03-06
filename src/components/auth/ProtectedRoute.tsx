import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { useLanguage } from '@/i18n/LanguageContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
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

  if (roles && roles.length > 0 && !roles.some(r => hasRole(r as any))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
