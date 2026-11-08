/** Client of our Cloudflare Worker API (`/v1`): chain menus, not-found requests and the OFF relay. */
import { ChainSchema, installationHeader, MenuItemSchema, MenuRequestStatusSchema, type MenuItem, type MenuRequestStatus, type OffProductInput } from "@nutri/shared";
import { z } from "zod";
import { defaultFetch, type FetchFn } from "./ClientOpenFoodFacts";

export class ClientServer {
  constructor(
    private readonly baseUrl: string,
    private readonly installationId: string,
    private readonly fetchFn: FetchFn = defaultFetch,
  ) {}

  private async request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}/v1${path}`, { ...init, headers: { [installationHeader]: this.installationId, ...init?.headers } });
    if (!response.ok) throw new Error(`Server error ${response.status}`);
    return schema.parse(await response.json());
  }

  async searchMenus(query: string, chain?: string): Promise<MenuItem[]> {
    const params = new URLSearchParams({ q: query });
    if (chain) params.set("chain", chain);
    return this.request(`/menus?${params}`, z.array(MenuItemSchema));
  }

  async listChains(): Promise<z.infer<typeof ChainSchema>[]> {
    return this.request("/chains", z.array(ChainSchema));
  }

  /** Records a not-found request; returns the server request ID. */
  async createMenuRequest(chainName: string, menuName: string): Promise<number> {
    const result = await this.request("/menu-requests", z.object({ requestId: z.number() }), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chainName, menuName }),
    });
    return result.requestId;
  }

  async getMenuRequestStatuses(ids: number[]): Promise<MenuRequestStatus[]> {
    if (ids.length === 0) return [];
    return this.request(`/menu-requests?ids=${ids.join(",")}`, z.array(MenuRequestStatusSchema));
  }

  /** Contributes a product to Open Food Facts through the relay. */
  async contributeProduct(input: OffProductInput): Promise<void> {
    await this.request("/off/products", z.object({ ok: z.boolean() }), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  }

  /** Uploads a product photo (`front`, `ingredients` or `nutrition`) through the relay. */
  async contributeImage(barcode: string, imageField: "front" | "ingredients" | "nutrition", jpeg: Blob): Promise<void> {
    const form = new FormData();
    form.append("barcode", barcode);
    form.append("imagefield", imageField);
    form.append("file", jpeg, "image.jpg");
    await this.request("/off/images", z.object({ ok: z.boolean() }), { method: "POST", body: form });
  }
}
