import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import { useLanguage } from '@/i18n/LanguageContext';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import LanguageToggle from './LanguageToggle';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  Settings,
  Mail,
  UserCheck,
  FileText,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles: string[];
}

const AppSidebar = () => {
  const { hasRole, signOut, profile } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const navItems: NavItem[] = [
    // SaaS Owner
    { label: t('nav.dashboard'), icon: LayoutDashboard, href: '/saas-dashboard', roles: ['saas_owner'] },
    { label: t('nav.tenants'), icon: Building2, href: '/saas-tenants', roles: ['saas_owner'] },

    // Client Admin
    { label: t('nav.dashboard'), icon: LayoutDashboard, href: '/dashboard', roles: ['client_admin', 'client_manager'] },
    { label: t('nav.team'), icon: Users, href: '/team', roles: ['client_admin'] },
    { label: t('nav.invitations'), icon: Mail, href: '/invitations', roles: ['client_admin'] },
    { label: t('nav.schedules'), icon: CalendarDays, href: '/schedules', roles: ['client_admin', 'client_manager'] },
    { label: t('nav.contracts'), icon: FileText, href: '/contracts', roles: ['client_admin', 'client_manager'] },

    // Employee
    { label: t('nav.my_schedule'), icon: CalendarDays, href: '/my-schedule', roles: ['client_employee'] },
    { label: t('nav.dashboard'), icon: LayoutDashboard, href: '/employee-dashboard', roles: ['client_employee'] },

    // All
    { label: t('nav.settings'), icon: Settings, href: '/settings', roles: ['saas_owner', 'client_admin', 'client_manager', 'client_employee'] },
  ];

  const visibleItems = navItems.filter(item =>
    item.roles.some(role => hasRole(role as any))
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <UserCheck className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-sm font-bold text-foreground">{t('app.name')}</h1>
          <p className="text-[10px] text-muted-foreground">{t('app.tagline')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href + item.label}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="truncate text-xs text-muted-foreground">
            {profile?.email ?? ''}
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </Button>
      </div>
    </aside>
  );
};

export default AppSidebar;
