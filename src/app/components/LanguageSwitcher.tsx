"use client";

import { usePathname, useRouter } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useState } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const switchLanguage = (newLocale: string) => {
    setIsOpen(false);
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change language"
      >
        <Globe className="h-4 w-4" />
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 rounded-md shadow-lg bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu">
            <button
              onClick={() => switchLanguage('fr')}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
                locale === 'fr' ? 'font-semibold text-blue-600' : 'text-slate-700 dark:text-slate-300'
              }`}
              role="menuitem"
            >
              Français
            </button>
            <button
              onClick={() => switchLanguage('en')}
              className={`block w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${
                locale === 'en' ? 'font-semibold text-blue-600' : 'text-slate-700 dark:text-slate-300'
              }`}
              role="menuitem"
            >
              English
            </button>
          </div>
        </div>
      )}
    </div>
  );
}