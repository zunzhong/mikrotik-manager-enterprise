export interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  children?: Array<{ label: string; path: string; icon: string }>;
}

export const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦' },
  {
    label: 'Thiết bị',
    path: '/devices',
    icon: '●',
    children: [
      { label: 'Thêm / Xóa thiết bị', path: '/devices/add-remove', icon: '+' },
      { label: 'Danh sách thiết bị', path: '/devices/list', icon: '≡' },
    ],
  },
  { label: 'Inventory', path: '/inventory', icon: '▤' },
  { label: 'Compliance', path: '/compliance', icon: '✓' },
  { label: 'Cảnh báo', path: '/alerts', icon: '!' },
  { label: 'Backup Center', path: '/backup-center', icon: '↥' },
  { label: 'Topology', path: '/topology', icon: '⌘' },
  { label: 'Cài đặt', path: '/settings', icon: '⚙' },
];
