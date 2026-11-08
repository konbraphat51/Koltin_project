/** i18next setup: English is the default, Japanese is supported. */
import { getLocales } from "expo-localization";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import type { LanguageSetting } from "../data/StoreSettings";
import en from "./Locales/en.json";
import ja from "./Locales/ja.json";

/** Resolves the effective language from the user's setting and the device locale. */
export function resolveLanguage(setting: LanguageSetting, deviceLanguage: string | null | undefined): "en" | "ja" {
  if (setting === "en" || setting === "ja") return setting;
  return deviceLanguage === "ja" ? "ja" : "en";
}

export function initializeI18n(setting: LanguageSetting): void {
  const language = resolveLanguage(setting, getLocales()[0]?.languageCode);
  if (i18next.isInitialized) {
    void i18next.changeLanguage(language);
    return;
  }
  void i18next.use(initReactI18next).init({ resources: { en: { translation: en }, ja: { translation: ja } }, lng: language, fallbackLng: "en", interpolation: { escapeValue: false }, initAsync: false });
}

export function changeLanguage(setting: LanguageSetting): void {
  void i18next.changeLanguage(resolveLanguage(setting, getLocales()[0]?.languageCode));
}
