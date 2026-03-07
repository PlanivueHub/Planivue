import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import type { BreakRule } from '@/types/database';

interface BreakRulesEditorProps {
  value: BreakRule[];
  onChange: (rules: BreakRule[]) => void;
}

const BreakRulesEditor = ({ value, onChange }: BreakRulesEditorProps) => {
  const { t } = useLanguage();

  const addRule = () => {
    onChange([...value, { threshold_hours: 0, break_minutes: 0 }]);
  };

  const updateRule = (index: number, field: keyof BreakRule, val: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], [field]: parseFloat(val) || 0 };
    onChange(updated);
  };

  const removeRule = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{t('contract.break_rules')}</Label>
          <p className="text-xs text-muted-foreground">{t('contract.break_rules_desc')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRule}>
          <Plus className="h-3.5 w-3.5" />
          {t('contract.add_break_rule')}
        </Button>
      </div>

      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((rule, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t('contract.after_hours')}</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={rule.threshold_hours || ''}
                  onChange={(e) => updateRule(i, 'threshold_hours', e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] text-muted-foreground">{t('contract.break_minutes')}</Label>
                <Input
                  type="number"
                  min="0"
                  value={rule.break_minutes || ''}
                  onChange={(e) => updateRule(i, 'break_minutes', e.target.value)}
                  className="h-8"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" className="mt-4 h-8 w-8 hover:text-destructive" onClick={() => removeRule(i)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BreakRulesEditor;
