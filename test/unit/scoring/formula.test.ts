import { describe, it, expect } from "vitest";
import { computeComponentDebt, classifySeverity, computeTeamDebt } from "../../../src/scoring/formula.js";

describe("computeComponentDebt", () => {
  it("returns zero debt when bus factor meets threshold", () => {
    const result = computeComponentDebt({
      component: "auth",
      complexity: 80,
      busFactor: 2,
      busFactorThreshold: 2,
    });
    expect(result.debtScore).toBe(0);
    expect(result.severity).toBe("LOW");
  });

  it("returns zero debt when bus factor exceeds threshold", () => {
    const result = computeComponentDebt({
      component: "auth",
      complexity: 80,
      busFactor: 5,
      busFactorThreshold: 2,
    });
    expect(result.debtScore).toBe(0);
  });

  it("returns full complexity as debt when bus factor is zero", () => {
    const result = computeComponentDebt({
      component: "api-layer",
      complexity: 60,
      busFactor: 0,
      busFactorThreshold: 2,
    });
    expect(result.debtScore).toBe(60);
  });

  it("returns partial debt when bus factor is below threshold", () => {
    const result = computeComponentDebt({
      component: "api-layer",
      complexity: 60,
      busFactor: 1,
      busFactorThreshold: 2,
    });
    // 60 × max(0, 1 - 1/2) = 60 × 0.5 = 30
    expect(result.debtScore).toBe(30);
  });

  it("handles the example from the session handover", () => {
    // Auth: Cs=80, N_req=2, BF=2 → Ed=0
    const auth = computeComponentDebt({
      component: "auth",
      complexity: 80,
      busFactor: 2,
      busFactorThreshold: 2,
    });
    expect(auth.debtScore).toBe(0);

    // API layer: Cs=60, N_req=2, BF=1 → Ed=30
    const api = computeComponentDebt({
      component: "api-layer",
      complexity: 60,
      busFactor: 1,
      busFactorThreshold: 2,
    });
    expect(api.debtScore).toBe(30);

    // Utilities: Cs=20, N_req=1, BF=1 → Ed=0
    const utils = computeComponentDebt({
      component: "utilities",
      complexity: 20,
      busFactor: 1,
      busFactorThreshold: 1,
    });
    expect(utils.debtScore).toBe(0);
  });
});

describe("classifySeverity", () => {
  it("classifies LOW for scores 0-25", () => {
    expect(classifySeverity(0)).toBe("LOW");
    expect(classifySeverity(25)).toBe("LOW");
  });

  it("classifies MEDIUM for scores 26-50", () => {
    expect(classifySeverity(26)).toBe("MEDIUM");
    expect(classifySeverity(50)).toBe("MEDIUM");
  });

  it("classifies HIGH for scores 51-75", () => {
    expect(classifySeverity(51)).toBe("HIGH");
    expect(classifySeverity(75)).toBe("HIGH");
  });

  it("classifies CRITICAL for scores above 75", () => {
    expect(classifySeverity(76)).toBe("CRITICAL");
    expect(classifySeverity(200)).toBe("CRITICAL");
  });
});

describe("computeTeamDebt", () => {
  it("sums risk-weighted debt across components", () => {
    const total = computeTeamDebt([
      { component: "auth", complexity: 80, busFactor: 2, busFactorThreshold: 2 },
      { component: "api", complexity: 60, busFactor: 1, busFactorThreshold: 2 },
      { component: "utils", complexity: 20, busFactor: 1, busFactorThreshold: 1 },
    ]);
    // 0 + 30 + 0 = 30
    expect(total).toBe(30);
  });

  it("returns zero when all components are fully covered", () => {
    const total = computeTeamDebt([
      { component: "auth", complexity: 80, busFactor: 3, busFactorThreshold: 2 },
      { component: "api", complexity: 60, busFactor: 2, busFactorThreshold: 2 },
    ]);
    expect(total).toBe(0);
  });
});
