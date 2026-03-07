import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { AppRole } from '@/types/database';

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAdded: () => void;
}

const AddEmployeeDialog = ({ open, onOpenChange, onEmployeeAdded }: AddEmployeeDialogProps) => {
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    role: 'client_employee' as AppRole,
    department: '',
    start_date: '',
    employee_type: 'full_time',
    manager: '',
    hourly_rate: '',
    status: 'active',
    employee_id: '',
    emergency_contact: '',
    phone: '',
    location: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const resetForm = () =>
    setForm({
      full_name: '',
      email: '',
      role: 'client_employee',
      department: '',
      start_date: '',
      employee_type: 'full_time',
      manager: '',
      hourly_rate: '',
      status: 'active',
      employee_id: '',
      emergency_contact: '',
      phone: '',
      location: '',
      notes: '',
    });

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error(t('addemp.fill_required'));
      return;
    }

    if (!profile?.tenant_id) return;
    setSaving(true);

    try {
      // Send invitation via the existing invitation system
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error } = await supabase.from('invitations').insert({
        tenant_id: profile.tenant_id,
        email: form.email.trim().toLowerCase(),
        role: form.role,
        invited_by: profile.id,
        expires_at: expiresAt.toISOString(),
        token: crypto.randomUUID(),
      });

      if (error) {
        if (error.code === '23505') {
          toast.error(t('addemp.already_invited'));
        } else {
          toast.error(error.message);
        }
        setSaving(false);
        return;
      }

      toast.success(t('addemp.success'));
      resetForm();
      onOpenChange(false);
      onEmployeeAdded();
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t('addemp.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Avatar */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">
            {getInitials(form.full_name)}
          </div>
          <div className="text-xs text-muted-foreground">
            {t('addemp.photo_hint')}
          </div>
        </div>

        {/* Form grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label>{t('addemp.full_name')}</Label>
            <Input
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              placeholder={t('addemp.ph_name')}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label>{t('addemp.email')}</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder={t('addemp.ph_email')}
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>{t('addemp.role')}</Label>
            <Select value={form.role} onValueChange={(v) => update('role', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_admin">{t('role.client_admin' as any)}</SelectItem>
                <SelectItem value="client_manager">{t('role.client_manager' as any)}</SelectItem>
                <SelectItem value="client_employee">{t('role.client_employee' as any)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label>{t('addemp.department')}</Label>
            <Select value={form.department} onValueChange={(v) => update('department', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('addemp.ph_department')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operations">{t('addemp.dept_operations')}</SelectItem>
                <SelectItem value="management">{t('addemp.dept_management')}</SelectItem>
                <SelectItem value="hr">{t('addemp.dept_hr')}</SelectItem>
                <SelectItem value="finance">{t('addemp.dept_finance')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <Label>{t('addemp.start_date')}</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => update('start_date', e.target.value)}
            />
          </div>

          {/* Employee Type */}
          <div className="space-y-1.5">
            <Label>{t('addemp.employee_type')}</Label>
            <Select value={form.employee_type} onValueChange={(v) => update('employee_type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">{t('addemp.type_full')}</SelectItem>
                <SelectItem value="part_time">{t('addemp.type_part')}</SelectItem>
                <SelectItem value="contract">{t('addemp.type_contract')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Manager */}
          <div className="space-y-1.5">
            <Label>{t('addemp.manager')}</Label>
            <Select value={form.manager} onValueChange={(v) => update('manager', v)}>
              <SelectTrigger>
                <SelectValue placeholder={t('addemp.ph_manager')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hourly Rate */}
          <div className="space-y-1.5">
            <Label>{t('addemp.hourly_rate')}</Label>
            <Input
              type="number"
              step="0.01"
              value={form.hourly_rate}
              onChange={(e) => update('hourly_rate', e.target.value)}
              placeholder={t('addemp.ph_rate')}
            />
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>{t('addemp.status')}</Label>
            <Select value={form.status} onValueChange={(v) => update('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('empmgmt.active')}</SelectItem>
                <SelectItem value="inactive">{t('empmgmt.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee ID */}
          <div className="space-y-1.5">
            <Label>{t('addemp.employee_id')}</Label>
            <Input
              value={form.employee_id}
              onChange={(e) => update('employee_id', e.target.value)}
              placeholder={t('addemp.ph_empid')}
            />
          </div>

          {/* Emergency Contact */}
          <div className="space-y-1.5">
            <Label>{t('addemp.emergency_contact')}</Label>
            <Input
              value={form.emergency_contact}
              onChange={(e) => update('emergency_contact', e.target.value)}
              placeholder={t('addemp.ph_emergency')}
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label>{t('addemp.phone')}</Label>
            <Input
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder={t('addemp.ph_phone')}
            />
          </div>

          {/* Location (full width) */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t('addemp.location')}</Label>
            <Input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              placeholder={t('addemp.ph_location')}
            />
          </div>

          {/* Notes (full width) */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t('addemp.notes')}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              placeholder={t('addemp.ph_notes')}
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => { resetForm(); onOpenChange(false); }}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddEmployeeDialog;
