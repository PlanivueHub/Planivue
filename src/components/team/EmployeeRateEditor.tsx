import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DollarSign, Edit } from 'lucide-react';
import { toast } from 'sonner';
import type { EmployeeDetail } from '@/types/database';

interface EmployeeRateEditorProps {
  userId: string;
  tenantId: string;
  onUpdate?: () => void;
}

const EmployeeRateEditor = ({ userId, tenantId, onUpdate }: EmployeeRateEditorProps) => {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rate, setRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = hasRole('client_admin');

  const fetchDetail = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('employee_details')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) setDetail(data as EmployeeDetail);
    setLoading(false);
  };

  useEffect(() => {
    fetchDetail();
  }, [userId]);

  const handleSave = async () => {
    const hourlyRate = parseFloat(rate);
    if (isNaN(hourlyRate) || hourlyRate < 0) return;
    setSubmitting(true);

    if (detail) {
      const { error } = await supabase
        .from('employee_details')
        .update({ hourly_rate: hourlyRate })
        .eq('id', detail.id);
      if (error) { toast.error(error.message); setSubmitting(false); return; }
    } else {
      const { error } = await supabase
        .from('employee_details')
        .insert({ user_id: userId, tenant_id: tenantId, hourly_rate: hourlyRate });
      if (error) { toast.error(error.message); setSubmitting(false); return; }
    }

    toast.success(t('emp_detail.rate_updated'));
    setDialogOpen(false);
    setSubmitting(false);
    fetchDetail();
    onUpdate?.();
  };

  if (loading) return <span className="text-xs text-muted-foreground">...</span>;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-sm">
        <DollarSign className="h-3.5 w-3.5 text-success" />
        <span className="font-mono font-medium">
          {detail ? `$${detail.hourly_rate.toFixed(2)}/h` : '—'}
        </span>
      </div>
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (o) setRate(detail?.hourly_rate?.toString() ?? ''); }}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display">{t('emp_detail.edit_rate')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>{t('emp_detail.hourly_rate')}</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="pl-9"
                    placeholder={t('emp_detail.rate_placeholder')}
                  />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full" disabled={submitting || !rate}>
                {submitting ? t('common.loading') : t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default EmployeeRateEditor;
