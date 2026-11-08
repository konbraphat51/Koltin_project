/** Root layout: opens the database, initializes i18n and provides services to all screens. */
import * as Crypto from "expo-crypto";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator } from "react-native";
import { registerBackgroundSync } from "../src/data/BackgroundSync";
import { adaptExpoSqlite } from "../src/data/AdapterExpoSqlite";
import { migrateDatabase } from "../src/data/Migrations";
import { keyValueStore } from "../src/data/StorageKeyValue";
import { StoreSettings } from "../src/data/StoreSettings";
import { syncPendingRequests } from "../src/data/SyncPendingRequest";
import { initializeI18n } from "../src/i18n/Index";
import { notifyDiaryChanged } from "../src/ui/DiaryEvents";
import { ServicesProvider, useServices } from "../src/ui/Services";

initializeI18n(new StoreSettings(keyValueStore, () => Crypto.randomUUID()).getLanguage());

/** Syncs pending chain requests once at start; offline failures are ignored. */
function SyncOnStart() {
  const { server, pending, food, diary } = useServices();
  useEffect(() => {
    void registerBackgroundSync();
    syncPendingRequests(server, pending, food, diary)
      .then((result) => {
        if (result.resolved > 0) notifyDiaryChanged();
      })
      .catch(() => undefined);
  }, [server, pending, food, diary]);
  return null;
}

function Screens() {
  const { t } = useTranslation();
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add/index" options={{ title: t("add.title") }} />
      <Stack.Screen name="add/scan" options={{ title: t("scan.title") }} />
      <Stack.Screen name="add/photo" options={{ title: t("photo.title") }} />
      <Stack.Screen name="add/manual" options={{ title: t("add.manual") }} />
      <Stack.Screen name="add/amount" options={{ title: t("amount.title") }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Suspense fallback={<ActivityIndicator style={{ flex: 1 }} />}>
      <SQLiteProvider databaseName="nutri.db" onInit={(db) => migrateDatabase(adaptExpoSqlite(db))} useSuspense>
        <ServicesProvider>
          <StatusBar style="auto" />
          <SyncOnStart />
          <Screens />
        </ServicesProvider>
      </SQLiteProvider>
    </Suspense>
  );
}
