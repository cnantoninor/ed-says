// Phase 2: File-based ledger store (.ed-says-ledger.json)

import type { Ledger, LedgerEntry } from "./types.js";
import type { LedgerStore } from "./store.js";

export class FileLedgerStore implements LedgerStore {
  constructor(private readonly _path: string, private readonly _maxEntries: number = 1000) {}

  async read(): Promise<Ledger> {
    // Phase 2: Will read from this._path
    return { version: 1, entries: [] };
  }

  async append(_entry: LedgerEntry): Promise<void> {
    // Phase 2: Will append to file, respecting _maxEntries rolling window
  }

  async getHistory(_component: string, _limit?: number): Promise<LedgerEntry[]> {
    // Phase 2: Will filter entries by component
    return [];
  }
}
