import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Copy, Check, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr as frLocale, enCA } from 'date-fns/locale';
import type { Invitation, AppRole } from '@/types/database';

const InvitationsPage = () => {
  const { hasRole, profile, user } = useAuth();
  const { t, language } = useLanguage();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('client_employee');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isAdmin = hasRole('client_admin');
  const dateLocale = language === 'fr' ? frLocale : enCA;

  const fetchInvitations = async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });
    if (data) setInvitations(data as Invitation[]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin && profile?.tenant_id) fetchInvitations();
  }, [isAdmin, profile?.tenant_id]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.tenant_id || !user) return;
    setSubmitting(true);

    // Check for existing pending invitation with same email
    const { data: existing } = await supabase
      .from('invitations')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('email', email)
      .is('accepted_at', null)
      .limit(1);

    if (existing && existing.length > 0) {
      toast.error(t('inv.duplicate_email') || 'An invitation for this email already exists');
      setSubmitting(false);
      return;
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: inserted, error } = await supabase
      .from('invitations')
      .insert({
        tenant_id: profile.tenant_id,
        email,
        role,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      // Send invitation email via edge function
      const inviteLink = `${window.location.origin}/invite/${(inserted as Invitation).token}`;
      try {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', profile.tenant_id)
          .single();

        await supabase.functions.invoke('send-invitation-email', {
          body: {
            email,
            inviteLink,
            invitedByName: profile.full_name || profile.email,
            tenantName: tenantData?.name || '',
            role,
          },
        });
        toast.success(t('inv.email_sent'));
      } catch (emailErr) {
        console.error('Failed to send invitation email:', emailErr);
        toast.success(t('inv.success'));
        toast.info(t('inv.email_failed'));
      }

      setEmail('');
      setRole('client_employee');
      setDialogOpen(false);
      fetchInvitations();
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('invitations').delete().eq('id', id);
    fetchInvitations();
  };

  const copyInviteLink = (token: string, id: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    toast.success(t('inv.copied'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getStatus = (inv: Invitation): 'pending' | 'accepted' | 'expired' => {
    if (inv.accepted_at) return 'accepted';
    if (new Date(inv.expires_at) < new Date()) return 'expired';
    return 'pending';
  };

  const statusVariant = (status: string) => {
    if (status === 'accepted') return 'default';
    if (status === 'expired') return 'destructive';
    return 'secondary';
  };

  const invitableRoles: { value: AppRole; label: string }[] = [
    { value: 'client_manager', label: t('role.client_manager') },
    { value: 'client_employee', label: t('role.client_employee') },
  ];

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">{t('inv.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('inv.subtitle')}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('inv.new')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{t('inv.new')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t('inv.email')}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="employee@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('inv.role')}</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {invitableRoles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={submitting}>
                <Mail className="h-4 w-4" />
                {submitting ? t('common.loading') : t('inv.send')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="font-display text-lg">{t('nav.invitations')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : invitations.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{t('inv.no_invitations')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inv.email')}</TableHead>
                  <TableHead>{t('inv.role')}</TableHead>
                  <TableHead>{t('inv.status')}</TableHead>
                  <TableHead>{t('inv.expires')}</TableHead>
                  <TableHead className="text-right">{t('saas.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const status = getStatus(inv);
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>{t(`role.${inv.role}` as any)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(status)} className="text-xs">
                          {t(`inv.${status}` as any)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {format(new Date(inv.expires_at), 'PPP p', { locale: dateLocale })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyInviteLink(inv.token, inv.id)}
                              title={t('inv.copy_link')}
                            >
                              {copiedId === inv.id ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(inv.id)}
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

export default InvitationsPage;
