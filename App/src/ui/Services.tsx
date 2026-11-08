/** Wires repositories, settings and API clients and exposes them to screens through React context. */
import * as Crypto from "expo-crypto";
import Storage from "expo-sqlite/kv-store";
import { useSQLiteContext } from "expo-sqlite";
import { adaptExpoSqlite } from "../data/AdapterExpoSqlite";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ClientOpenFoodFacts } from "../data/ClientOpenFoodFacts";
import { ClientOpenAi } from "../data/ClientOpenAi";
import { ClientServer } from "../data/ClientServer";
import { RepositoryDiary } from "../data/RepositoryDiary";
import { RepositoryFood } from "../data/RepositoryFood";
import { RepositoryPending } from "../data/RepositoryPending";
import { StoreSettings } from "../data/StoreSettings";
import { readOpenAiKey } from "../data/StoreSecret";
import { createMextIndex, type MextIndexEntry, type MextRecord } from "../domain/SearchMext";
import mextFoods from "../../assets/Mext/MextFoods.json";

export interface Services {
  food: RepositoryFood;
  diary: RepositoryDiary;
  pending: RepositoryPending;
  settings: StoreSettings;
  server: ClientServer;
  openFoodFacts: ClientOpenFoodFacts;
  mextIndex: MextIndexEntry[];
  /** Creates an LLM client from the stored key, or null when no key is registered. */
  createLlmClient(): Promise<ClientOpenAi | null>;
}

const mextIndex = createMextIndex(mextFoods as MextRecord[]);
const serverUrl = (process.env.EXPO_PUBLIC_SERVER_URL ?? "http://localhost:8787").replace(/\/$/, "");

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const expoDb = useSQLiteContext();
  const db = useMemo(() => adaptExpoSqlite(expoDb), [expoDb]);
  const services = useMemo<Services>(() => {
    const settings = new StoreSettings(Storage, () => Crypto.randomUUID());
    return {
      food: new RepositoryFood(db),
      diary: new RepositoryDiary(db),
      pending: new RepositoryPending(db),
      settings,
      server: new ClientServer(serverUrl, settings.getInstallationId()),
      openFoodFacts: new ClientOpenFoodFacts(),
      mextIndex,
      async createLlmClient() {
        const key = await readOpenAiKey();
        return key ? new ClientOpenAi(key, settings.getOpenAiModel()) : null;
      },
    };
  }, [db]);
  return <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>;
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("ServicesProvider is missing");
  return services;
}
