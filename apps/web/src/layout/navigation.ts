export interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  children?: Array<{ label: string; path: string; icon: string }>;
}

export function createNavigationItems(t: (key: TranslationKey) => string): NavigationItem[] {
  return [
    { label: t('dashboard'), path: '/dashboard', icon: '▦' },
    {
      label: t('devices'),
      path: '/devices',
      icon: '●',
      children: [
        { label: t('addRemoveDevice'), path: '/devices/add-remove', icon: '+' },
        { label: t('deviceList'), path: '/devices/list', icon: '≡' },
      ],
    },
    { label: t('inventory'), path: '/inventory', icon: '▤' },
    { label: t('compliance'), path: '/compliance', icon: '✓' },
    { label: t('alerts'), path: '/alerts', icon: '!' },
    { label: t('reports'), path: '/reports', icon: '▥' },
    { label: t('backupCenter'), path: '/backup-center', icon: '↥' },
    { label: t('topology'), path: '/topology', icon: '⌘' },
    { label: t('settings'), path: '/settings', icon: '⚙' },
  ];
}
import type { TranslationKey } from '../i18n/LanguageContext';
