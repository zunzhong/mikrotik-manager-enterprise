import { apiGet, apiPatch } from '../../lib/api';
import type { Language } from '../../i18n/LanguageContext';

export interface SystemPreferences {
  timeZone: string;
  language: Language;
  updatedAt: string;
}

export const systemPreferencesApi = {
  get: () => apiGet<SystemPreferences>('/api/v1/system/preferences'),
  update: (input: { timeZone?: string; language?: Language }) =>
    apiPatch<SystemPreferences>('/api/v1/system/preferences', input),
};
