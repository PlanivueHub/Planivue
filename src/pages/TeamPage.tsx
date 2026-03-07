import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Users, Search, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { Profile, AppRole, UserRole } from '@/types/database';
import EmployeeRateEditor from '@/components/team/EmployeeRateEditor';

interface TeamMember extends Profile {
  roles: AppRole[];
}

const TeamPage = () => {
  const { hasRole, profile, user } = useAuth();
  const { t, language } = useLanguage();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const isAdmin = hasRole('client_admin');
  const dateLocale = language === 'fr' ? frLocale : enCA;

  const fetchTeam = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);

    // Fetch all profiles in tenant
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: true });

    if (!profiles) { setLoading(false); return; }

    // Fetch all roles for these users
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

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleRoleChange = async (userId: string, currentRole: AppRole, newRole: AppRole) => {
    if (userId === user?.id) {
      toast.error(t('team.cannot_change_own'));
      return;
    }

    // Remove old role
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', currentRole);

    // Add new role
    await supabase
      .from('user_roles')
      .insert({ user_id: userId, tenant_id: profile?.tenant_id, role: newRole });

    toast.success(t('team.role_updated'));
    fetchTeam();
  };

  const handleRemoveUser = async (userId: string) => {
    if (userId === user?.id) return;

    // Remove roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    // Detach from tenant
    await supabase
      .from('profiles')
      .update({ tenant_id: null })
      .eq('id', userId);

    toast.success(t('team.member_removed'));
    fetchTeam();
  };

  const changableRoles: AppRole[] = ['client_admin', 'client_manager', 'client_employee'];

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{t('team.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('team.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm font-semibold">{members.length}</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('common.search')}
          className="pl-9"
        />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-lg">{t('team.members')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : filteredMembers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('team.no_members')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('auth.full_name')}</TableHead>
                  <TableHead>{t('auth.email')}</TableHead>
                  <TableHead>{t('inv.role')}</TableHead>
                  <TableHead>{t('team.joined')}</TableHead>
                  <TableHead className="text-right">{t('saas.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => {
                  const primaryRole = member.roles[0] || 'client_employee';
                  const isSelf = member.id === user?.id;

                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {member.full_name || '—'}
                          {isSelf && (
                            <Badge variant="outline" className="text-[10px]">
                              {language === 'fr' ? 'Vous' : 'You'}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        {isSelf ? (
                          <Badge variant="default" className="text-xs">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            {t(`role.${primaryRole}` as any)}
                          </Badge>
                        ) : (
                          <Select
                            value={primaryRole}
                            onValueChange={(v) => handleRoleChange(member.id, primaryRole, v as AppRole)}
                          >
                            <SelectTrigger className="h-8 w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {changableRoles.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {t(`role.${r}` as any)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(member.created_at), 'PPP', { locale: dateLocale })}
                      </TableCell>
                      <TableCell className="text-right">
                        {!isSelf && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('team.remove_title')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('team.remove_confirm')} <strong>{member.full_name || member.email}</strong>?
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamPage;
