export interface NavigationItem {
  label: string;
  path: string;
  icon: string;
}

export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  { label: 'Devices', path: '/devices', icon: '●' },
  { label: 'Inventory', path: '/inventory', icon: '▤' },
  { label: 'Compliance', path: '/compliance', icon: '✓' },
  { label: 'Alerts', path: '/alerts', icon: '!' },
  { label: 'Backup Center', path: '/backup-center', icon: '↥' },
  { label: 'Topology', path: '/topology', icon: '⌘' },
  { label: 'Settings', path: '/settings', icon: '⚙' },
];
