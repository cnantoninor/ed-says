import { describe, it, expect } from "vitest";
import { runPipeline } from "../../src/core/pipeline.js";
import { configSchema } from "../../src/core/config.js";

const SAMPLE_DIFF = `diff --git a/src/core/pipeline.ts b/src/core/pipeline.ts
index 1234567..abcdefg 100644
--- a/src/core/pipeline.ts
+++ b/src/core/pipeline.ts
@@ -1,5 +1,15 @@
+import { something } from "./types.js";
+
 export async function runPipeline() {
-  return null;
+  if (config.mode === "full") {
+    for (const component of components) {
+      if (component.busFactor < component.threshold) {
+        const questions = await generateQuestions(component);
+        if (questions.length > 0 && isEnabled) {
+          await postQuestions(questions);
+        }
+      }
+    }
+  }
+  return result;
 }
`;

describe("pipeline integration", () => {
  it("runs full pipeline with static-only mode", async () => {
    const config = configSchema.parse({
      components: [
        {
          name: "core",
          paths: ["src/core/**"],
          subdomain: "core",
          bus_factor_threshold: 2,
        },
      ],
    });

    const result = await runPipeline({
      diff: SAMPLE_DIFF,
      config,
      mode: "static-only",
    });

    expect(result.totalDebt).toBeGreaterThanOrEqual(0);
    expect(result.severity).toBeDefined();
    expect(result.components).toHaveLength(1);
    expect(result.components[0].component).toBe("core");
    expect(result.components[0].complexity).toBeGreaterThan(0);
    expect(result.summary).toContain("Ed Says");
    expect(result.timestamp).toBeDefined();
  });

  it("returns zero debt when no components match", async () => {
    const config = configSchema.parse({
      components: [
        {
          name: "unrelated",
          paths: ["src/unrelated/**"],
          subdomain: "generic",
        },
      ],
    });

    const result = await runPipeline({
      diff: SAMPLE_DIFF,
      config,
      mode: "static-only",
    });

    expect(result.totalDebt).toBe(0);
    expect(result.severity).toBe("LOW");
    expect(result.components).toHaveLength(0);
  });

  it("handles empty diff", async () => {
    const config = configSchema.parse({});

    const result = await runPipeline({
      diff: "",
      config,
      mode: "static-only",
    });

    expect(result.totalDebt).toBe(0);
    expect(result.components).toHaveLength(0);
  });
});
