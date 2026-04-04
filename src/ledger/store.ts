// Phase 2: Abstract storage interface for the debt ledger

import type { Ledger, LedgerEntry } from "./types.js";

export interface LedgerStore {
  read(): Promise<Ledger>;
  append(entry: LedgerEntry): Promise<void>;
  getHistory(component: string, limit?: number): Promise<LedgerEntry[]>;
}
