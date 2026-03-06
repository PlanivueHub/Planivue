import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
      className="gap-1.5 font-mono text-xs"
    >
      <Globe className="h-3.5 w-3.5" />
      {language === 'fr' ? 'EN' : 'FR'}
    </Button>
  );
};

export default LanguageToggle;
