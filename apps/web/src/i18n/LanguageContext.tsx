import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { systemPreferencesApi } from '../modules/settings/system-preferences.api';

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
  savedAutomatically: 'Thay đổi được lưu cho toàn bộ hệ thống MME.',
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
  themeToggle: 'Chuyển giao diện sáng / tối',
  timezone: 'Múi giờ',
  timezoneTitle: 'Múi giờ hệ thống',
  timezoneDescription: 'Múi giờ dùng để hiển thị ngày giờ trong toàn bộ giao diện MME.',
  browserTimezone: 'Tự động theo trình duyệt',
  addEditDevice: 'Thêm / Chỉnh sửa thiết bị',
  managedDevices: 'Thiết bị đang quản lý',
  edit: 'Chỉnh sửa',
  save: 'Lưu thay đổi',
  cancel: 'Hủy',
  deleteDevice: 'Xóa thiết bị',
  refresh: 'Làm mới',
  alertRules: 'Quy tắc cảnh báo',
  enable: 'Bật',
  disable: 'Tắt',
  removeRule: 'Xóa cấu hình',
  addRule: 'Thêm quy tắc',
  notificationGuide: 'Tải hướng dẫn cấu hình kênh thông báo',
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
  savedAutomatically: 'Changes are saved for the entire MME system.',
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
  themeToggle: 'Switch light / dark theme',
  timezone: 'Time zone',
  timezoneTitle: 'System time zone',
  timezoneDescription: 'Time zone used to display dates and times throughout MME.',
  browserTimezone: 'Automatic (browser)',
  addEditDevice: 'Add / Edit device',
  managedDevices: 'Managed devices',
  edit: 'Edit',
  save: 'Save changes',
  cancel: 'Cancel',
  deleteDevice: 'Delete device',
  refresh: 'Refresh',
  alertRules: 'Alert rules',
  enable: 'Enable',
  disable: 'Disable',
  removeRule: 'Remove configuration',
  addRule: 'Add rule',
  notificationGuide: 'Download notification channel setup guide',
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
  t: (key: TranslationKey) => string;
  timeZone: string;
  setTimeZone: (timeZone: string) => Promise<void>;
  formatDateTime: (value: string | number | Date) => string;
  formatTime: (value: string | number | Date) => string;
  tr: (vietnamese: string, english: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = window.localStorage.getItem('mme-language');
    return stored === 'en' ? 'en' : 'vi';
  });
  const [timeZone, setTimeZoneState] = useState(
    () =>
      window.localStorage.getItem('mme-timezone') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  useEffect(() => {
    let active = true;
    void systemPreferencesApi
      .get()
      .then((preferences) => {
        if (!active) return;
        setLanguageState(preferences.language);
        setTimeZoneState(preferences.timeZone);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (next: Language) => {
    const preferences = await systemPreferencesApi.update({ language: next });
    setLanguageState(preferences.language);
    setTimeZoneState(preferences.timeZone);
  }, []);

  const setTimeZone = useCallback(async (next: string) => {
    const preferences = await systemPreferencesApi.update({ timeZone: next });
    setLanguageState(preferences.language);
    setTimeZoneState(preferences.timeZone);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('mme-language', language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem('mme-timezone', timeZone);
  }, [timeZone]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => (language === 'en' ? en[key] : vi[key]),
      timeZone,
      setTimeZone,
      formatDateTime: (value) =>
        new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
          timeZone,
          dateStyle: 'medium',
          timeStyle: 'medium',
        }).format(new Date(value)),
      formatTime: (value) =>
        new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(new Date(value)),
      tr: (vietnamese, english) => (language === 'en' ? english : vietnamese),
    }),
    [language, setLanguage, setTimeZone, timeZone],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
