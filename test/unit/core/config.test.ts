import { describe, it, expect } from "vitest";
import { configSchema } from "../../../src/core/config.js";

describe("configSchema", () => {
  it("parses a minimal config with all defaults", () => {
    const result = configSchema.parse({});

    expect(result.version).toBe(1);
    expect(result.components).toEqual([]);
    expect(result.thresholds.levels.implementation.weight).toBe(1.0);
    expect(result.thresholds.levels.implementation.enabled).toBe(true);
    expect(result.analyzers.complexity.engine).toBe("heuristic");
    expect(result.output.comment).toBe(true);
  });

  it("parses a full config", () => {
    const result = configSchema.parse({
      version: 1,
      components: [
        {
          name: "auth",
          paths: ["src/auth/**"],
          subdomain: "core",
          bus_factor_threshold: 3,
          owners: ["@auth-team"],
        },
      ],
      thresholds: {
        levels: {
          requirements: { weight: 1.0, enabled: true },
          specification: { weight: 0.8, enabled: true },
          implementation: { weight: 1.0, enabled: true },
          validation: { weight: 0.6, enabled: false },
        },
      },
      llmj: {
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
      },
    });

    expect(result.components).toHaveLength(1);
    expect(result.components[0].name).toBe("auth");
    expect(result.components[0].subdomain).toBe("core");
    expect(result.components[0].bus_factor_threshold).toBe(3);
    expect(result.thresholds.levels.validation.enabled).toBe(false);
    expect(result.llmj.provider).toBe("anthropic");
  });

  it("applies default bus_factor_threshold of 2", () => {
    const result = configSchema.parse({
      components: [{ name: "api", paths: ["src/api/**"] }],
    });

    expect(result.components[0].bus_factor_threshold).toBe(2);
  });

  it("rejects invalid subdomain", () => {
    expect(() =>
      configSchema.parse({
        components: [{ name: "api", paths: ["src/**"], subdomain: "invalid" }],
      }),
    ).toThrow();
  });

  it("rejects negative bus_factor_threshold", () => {
    expect(() =>
      configSchema.parse({
        components: [{ name: "api", paths: ["src/**"], bus_factor_threshold: -1 }],
      }),
    ).toThrow();
  });
});
