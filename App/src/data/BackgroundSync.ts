/** Registers the daily background task that syncs pending chain requests (best effort; also runs at app start). */
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { openDatabaseAsync } from "expo-sqlite";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { adaptExpoSqlite } from "./AdapterExpoSqlite";
import { ClientServer } from "./ClientServer";
import { migrateDatabase } from "./Migrations";
import { RepositoryDiary } from "./RepositoryDiary";
import { RepositoryFood } from "./RepositoryFood";
import { RepositoryPending } from "./RepositoryPending";
import { keyValueStore } from "./StorageKeyValue";
import { StoreSettings } from "./StoreSettings";
import { syncPendingRequests } from "./SyncPendingRequest";

const taskName = "nutri-pending-sync";
const serverUrl = (process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost:8787").replace(/\/$/, "");

if (Platform.OS !== "web") {
  TaskManager.defineTask(taskName, async () => {
    try {
      const db = adaptExpoSqlite(await openDatabaseAsync("nutri.db"));
      await migrateDatabase(db);
      const settings = new StoreSettings(keyValueStore, () => Crypto.randomUUID());
      await syncPendingRequests(new ClientServer(serverUrl, settings.getInstallationId()), new RepositoryPending(db), new RepositoryFood(db), new RepositoryDiary(db));
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/** Registers the task once; failures (e.g. unsupported environment) are ignored. */
export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await BackgroundTask.registerTaskAsync(taskName, { minimumInterval: 60 * 24 });
  } catch {
    // Background tasks are optional; the app also syncs on start.
  }
}
