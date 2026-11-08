/** Fetches the status of pending chain requests and applies resolved menu items to the diary. */
import { scaleNutrients } from "@nutri/shared";
import { convertMenuItem } from "../domain/ConverterMenuItem";
import type { ClientServer } from "./ClientServer";
import type { RepositoryDiary } from "./RepositoryDiary";
import type { RepositoryFood } from "./RepositoryFood";
import type { RepositoryPending } from "./RepositoryPending";

export interface SyncResult {
  resolved: number;
  rejected: number;
}

/** Applies server decisions to local data. One serving of the registered item replaces the provisional values. */
export async function syncPendingRequests(server: Pick<ClientServer, "getMenuRequestStatuses">, pending: RepositoryPending, food: RepositoryFood, diary: RepositoryDiary): Promise<SyncResult> {
  const result: SyncResult = { resolved: 0, rejected: 0 };
  const open = await pending.listOpen();
  if (open.length === 0) return result;

  const statuses = await server.getMenuRequestStatuses(open.map((p) => p.serverRequestId));
  for (const status of statuses) {
    const request = open.find((p) => p.serverRequestId === status.requestId);
    if (!request) continue;
    if (status.status === "resolved" && status.menuItem) {
      const item = convertMenuItem(status.menuItem);
      const foodItemId = await food.save(item);
      const servingG = item.servingG ?? 100;
      await diary.resolvePending(request.id, foodItemId, item.name, servingG, scaleNutrients(item.per100g, servingG));
      await pending.setStatus(request.id, "resolved");
      result.resolved++;
    } else if (status.status === "rejected") {
      await pending.setStatus(request.id, "rejected");
      result.rejected++;
    }
  }
  return result;
}
