import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Language = 'vi' | 'en';

export type TranslationKey = keyof typeof vi;

const vi = {
  dashboard: 'Dashboard',
  devices: 'Thiết bị',
  addRemoveDevice: 'Thêm / Xóa thiết bị',
  deviceList: 'Danh sách thiết bị',
  inventory: 'Inventory',
  compliance: 'Compliance',
  alerts: 'Cảnh báo',
  backupCenter: 'Trung tâm sao lưu',
  topology: 'Sơ đồ mạng',
  settings: 'Cài đặt',
  lightMode: 'Chế độ sáng',
  darkMode: 'Chế độ tối',
  adminAccount: 'Tài khoản quản trị',
  signedIn: 'Đang đăng nhập',
  logout: 'Đăng xuất',
  collapseMenu: 'Thu gọn menu',
  expandMenu: 'Mở rộng menu',
  language: 'Ngôn ngữ',
  languageTitle: 'Ngôn ngữ hệ thống',
  languageDescription: 'Chọn ngôn ngữ hiển thị cho giao diện quản trị MME.',
  vietnamese: 'Tiếng Việt',
  english: 'English',
  savedAutomatically: 'Thay đổi được lưu tự động trên trình duyệt này.',
  settingsTitle: 'Cài đặt',
  settingsDescription: 'Cấu hình tài khoản, bảo mật, ngôn ngữ và trạng thái hệ thống.',
  overview: 'Tổng quan',
  realtime: 'Thời gian thực',
  interfaces: 'Interfaces',
  backups: 'Sao lưu',
  terminal: 'Terminal',
  trafficMonitor: 'Traffic Monitor',
  alertCenter: 'Trung tâm cảnh báo',
  alertDescription: 'Theo dõi cảnh báo và cấu hình Email, Telegram, Slack hoặc Webhook.',
  notificationChannels: 'Kênh gửi cảnh báo',
  login: 'Đăng nhập',
  loginDescription: 'Truy cập bảng điều khiển quản trị MME.',
  account: 'Email / tài khoản',
  password: 'Mật khẩu',
  signingIn: 'Đang đăng nhập...',
  loginFailed: 'Đăng nhập thất bại',
  preflight: 'Kiểm tra cài đặt và cơ sở dữ liệu',
} as const;

const en: Record<TranslationKey, string> = {
  dashboard: 'Dashboard',
  devices: 'Devices',
  addRemoveDevice: 'Add / Remove device',
  deviceList: 'Device list',
  inventory: 'Inventory',
  compliance: 'Compliance',
  alerts: 'Alerts',
  backupCenter: 'Backup Center',
  topology: 'Topology',
  settings: 'Settings',
  lightMode: 'Light mode',
  darkMode: 'Dark mode',
  adminAccount: 'Administrator account',
  signedIn: 'Signed in',
  logout: 'Sign out',
  collapseMenu: 'Collapse menu',
  expandMenu: 'Expand menu',
  language: 'Language',
  languageTitle: 'System language',
  languageDescription: 'Choose the display language for the MME administration interface.',
  vietnamese: 'Vietnamese',
  english: 'English',
  savedAutomatically: 'Changes are saved automatically in this browser.',
  settingsTitle: 'Settings',
  settingsDescription: 'Configure account, security, language and system status.',
  overview: 'Overview',
  realtime: 'Realtime',
  interfaces: 'Interfaces',
  backups: 'Backups',
  terminal: 'Terminal',
  trafficMonitor: 'Traffic Monitor',
  alertCenter: 'Alert Center',
  alertDescription: 'Monitor alerts and configure Email, Telegram, Slack or Webhook delivery.',
  notificationChannels: 'Alert delivery channels',
  login: 'Sign in',
  loginDescription: 'Access the MME administration dashboard.',
  account: 'Email / account',
  password: 'Password',
  signingIn: 'Signing in...',
  loginFailed: 'Sign in failed',
  preflight: 'Check installation and database',
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = window.localStorage.getItem('mme-language');
    return stored === 'en' ? 'en' : 'vi';
  });

  useEffect(() => {
    window.localStorage.setItem('mme-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => (language === 'en' ? en[key] : vi[key]),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
