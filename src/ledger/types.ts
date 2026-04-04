// Phase 2: Debt ledger time series types

export interface LedgerEntry {
  timestamp: string; // ISO 8601
  prNumber: number;
  sha: string;
  component: string;
  complexity: number; // Cs_k(t) at merge time
  grasp: number; // Gc_k(t) — running average of author scores
  debt: number; // Cs_k(t) - Gc_k(t)
  author: string;
}

export interface Ledger {
  version: number;
  entries: LedgerEntry[];
}
