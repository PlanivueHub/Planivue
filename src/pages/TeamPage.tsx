import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { Search, Trash2, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { Profile, AppRole, UserRole } from '@/types/database';

interface TeamMember extends Profile {
  roles: AppRole[];
}

const ROWS_PER_PAGE = 10;

const TeamPage = () => {
  const { hasRole, profile, user } = useAuth();
  const { t, language } = useLanguage();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const isAdmin = hasRole('client_admin');
  const dateLocale = language === 'fr' ? frLocale : enCA;

  const fetchTeam = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: true });

    if (!profiles) { setLoading(false); return; }

    const userIds = (profiles as Profile[]).map(p => p.id);
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('*')
      .in('user_id', userIds);

    const rolesMap = new Map<string, AppRole[]>();
    if (rolesData) {
      for (const r of rolesData as UserRole[]) {
        const existing = rolesMap.get(r.user_id) || [];
        existing.push(r.role);
        rolesMap.set(r.user_id, existing);
      }
    }

    const enriched: TeamMember[] = (profiles as Profile[]).map(p => ({
      ...p,
      roles: rolesMap.get(p.id) || [],
    }));

    setMembers(enriched);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin && profile?.tenant_id) fetchTeam();
  }, [isAdmin, profile?.tenant_id]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      m =>
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
    );
  }, [members, search]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ROWS_PER_PAGE));
  const paginatedMembers = filteredMembers.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleRoleChange = async (userId: string, currentRole: AppRole, newRole: AppRole) => {
    if (userId === user?.id) {
      toast.error(t('empmgmt.cannot_change_own'));
      return;
    }
    await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', currentRole);
    await supabase.from('user_roles').insert({ user_id: userId, tenant_id: profile?.tenant_id, role: newRole });
    toast.success(t('empmgmt.role_updated'));
    fetchTeam();
  };

  const handleRemoveUser = async (userId: string) => {
    if (userId === user?.id) return;
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('profiles').update({ tenant_id: null }).eq('id', userId);
    toast.success(t('empmgmt.member_removed'));
    fetchTeam();
  };

  const changableRoles: AppRole[] = ['client_admin', 'client_manager', 'client_employee'];

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    return parts.map(p => p[0]?.toUpperCase()).slice(0, 2).join('');
  };

  const renderPaginationItems = () => {
    const items: React.ReactNode[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

    if (start > 1) {
      items.push(
        <PaginationItem key={1}><PaginationLink onClick={() => setPage(1)} isActive={page === 1}>1</PaginationLink></PaginationItem>
      );
      if (start > 2) items.push(<PaginationItem key="el-start"><PaginationEllipsis /></PaginationItem>);
    }
    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink onClick={() => setPage(i)} isActive={page === i} className={page === i ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}>
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }
    if (end < totalPages) {
      if (end < totalPages - 1) items.push(<PaginationItem key="el-end"><PaginationEllipsis /></PaginationItem>);
      items.push(
        <PaginationItem key={totalPages}><PaginationLink onClick={() => setPage(totalPages)} isActive={page === totalPages}>{totalPages}</PaginationLink></PaginationItem>
      );
    }
    return items;
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{t('empmgmt.title')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('empmgmt.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('common.search')}
              className="h-9 w-56 pl-9 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            {t('empmgmt.import_csv')}
          </Button>
          <Button size="sm" className="gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            {t('empmgmt.add_employee')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border/50 bg-card">
        {loading ? (
          <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
        ) : filteredMembers.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">{t('emp.no_members')}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t('auth.full_name')}</TableHead>
                  <TableHead>{t('auth.email')}</TableHead>
                  <TableHead>{t('inv.role')}</TableHead>
                  <TableHead>{t('emp.company')}</TableHead>
                  <TableHead>{t('emp.status')}</TableHead>
                  <TableHead>{t('emp.last_login')}</TableHead>
                  <TableHead className="text-right">{t('saas.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMembers.map((member) => {
                  const primaryRole = member.roles[0] || 'client_employee';
                  const isSelf = member.id === user?.id;
                  const isActive = true; // placeholder — can be derived from last login delta
                  const initials = getInitials(member.full_name);

                  return (
                    <TableRow key={member.id}>
                      {/* Employee with avatar */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                            {initials}
                          </div>
                          <span className="font-medium">{member.full_name || '—'}</span>
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px]">
                              {language === 'fr' ? 'Vous' : 'You'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>

                      {/* Role */}
                      <TableCell>
                        {isSelf ? (
                          <span className="text-sm">{t(`role.${primaryRole}` as any)}</span>
                        ) : (
                          <Select
                            value={primaryRole}
                            onValueChange={(v) => handleRoleChange(member.id, primaryRole, v as AppRole)}
                          >
                            <SelectTrigger className="h-8 w-32 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {changableRoles.map((r) => (
                                <SelectItem key={r} value={r}>{t(`role.${r}` as any)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>

                      {/* Company (tenant name placeholder) */}
                      <TableCell className="text-muted-foreground">—</TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant={isActive ? 'default' : 'secondary'}
                          className={isActive
                            ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 border-0'
                            : 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/20 border-0'
                          }
                        >
                          {isActive ? t('emp.active') : t('emp.inactive')}
                        </Badge>
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(member.created_at), 'dd/MM/yyyy', { locale: dateLocale })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {!isSelf && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('emp.remove_title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('emp.remove_confirm')} <strong>{member.full_name || member.email}</strong>?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveUser(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-border/50 px-4 py-3">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setPage(p => Math.max(1, p - 1))} className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                    </PaginationItem>
                    {renderPaginationItems()}
                    <PaginationItem>
                      <PaginationNext onClick={() => setPage(p => Math.min(totalPages, p + 1))} className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
