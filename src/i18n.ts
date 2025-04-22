import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enJson from './locales/en';
import zhTwJson from './locales/zh-tw';
import zhTw from './locales/zh-tw';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enJson,
      },
      zhTw: {
        translation: zhTwJson,
      },
    },
    lng: 'en', // 預設語系
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
