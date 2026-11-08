/** Persistence of chain menu requests waiting for the developer's batch. */
import type { PendingChainRequest, PendingStatus } from "../domain/Models";
import type { SqlDatabase } from "./SqlDatabase";

interface PendingRow {
  id: number;
  server_request_id: number;
  chain_name: string;
  menu_name: string;
  status: PendingStatus;
}

function toPending(row: PendingRow): PendingChainRequest {
  return { id: row.id, serverRequestId: row.server_request_id, chainName: row.chain_name, menuName: row.menu_name, status: row.status };
}

export class RepositoryPending {
  constructor(private readonly db: SqlDatabase) {}

  /** Saves a request; the same server request ID returns the existing row. */
  async add(serverRequestId: number, chainName: string, menuName: string): Promise<number> {
    await this.db.runAsync("INSERT OR IGNORE INTO pending_chain_requests (server_request_id, chain_name, menu_name) VALUES (?, ?, ?)", [serverRequestId, chainName, menuName]);
    const row = await this.db.getFirstAsync<{ id: number }>("SELECT id FROM pending_chain_requests WHERE server_request_id = ?", [serverRequestId]);
    return row!.id;
  }

  async listOpen(): Promise<PendingChainRequest[]> {
    const rows = await this.db.getAllAsync<PendingRow>("SELECT id, server_request_id, chain_name, menu_name, status FROM pending_chain_requests WHERE status = 'open' ORDER BY id");
    return rows.map(toPending);
  }

  async setStatus(id: number, status: PendingStatus): Promise<void> {
    await this.db.runAsync("UPDATE pending_chain_requests SET status = ? WHERE id = ?", [status, id]);
  }
}
