import { describe, it, expect } from "vitest";
import { parseDiff } from "../../../src/analyzers/diff-parser.js";

const SAMPLE_DIFF = `diff --git a/src/core/pipeline.ts b/src/core/pipeline.ts
index 1234567..abcdefg 100644
--- a/src/core/pipeline.ts
+++ b/src/core/pipeline.ts
@@ -1,5 +1,10 @@
+import { something } from "./types.js";
+
 export async function runPipeline() {
-  return null;
+  const config = loadConfig();
+  const diff = fetchDiff();
+  const result = analyze(diff, config);
+  return result;
 }
diff --git a/src/utils/logger.ts b/src/utils/logger.ts
index 1234567..abcdefg 100644
--- a/src/utils/logger.ts
+++ b/src/utils/logger.ts
@@ -1,3 +1,5 @@
+export function debug(msg: string) {
+  console.debug(msg);
+}
`;

const COMPONENTS = [
  { name: "core", paths: ["src/core/**"] },
  { name: "utils", paths: ["src/utils/**"] },
];

describe("parseDiff", () => {
  it("groups files by component based on path patterns", () => {
    const result = parseDiff(SAMPLE_DIFF, COMPONENTS);

    expect(result).toHaveLength(2);

    const core = result.find((r) => r.component === "core");
    expect(core).toBeDefined();
    expect(core!.files).toHaveLength(1);
    expect(core!.files[0].path).toBe("src/core/pipeline.ts");

    const utils = result.find((r) => r.component === "utils");
    expect(utils).toBeDefined();
    expect(utils!.files).toHaveLength(1);
    expect(utils!.files[0].path).toBe("src/utils/logger.ts");
  });

  it("counts additions and deletions correctly", () => {
    const result = parseDiff(SAMPLE_DIFF, COMPONENTS);
    const core = result.find((r) => r.component === "core")!;

    expect(core.files[0].additions).toBe(6);
    expect(core.files[0].deletions).toBe(1);
  });

  it("puts unmatched files in 'unmatched' group", () => {
    const diff = `diff --git a/README.md b/README.md
index 1234567..abcdefg 100644
--- a/README.md
+++ b/README.md
@@ -1,1 +1,2 @@
+New line
`;

    const result = parseDiff(diff, COMPONENTS);
    const unmatched = result.find((r) => r.component === "unmatched");
    expect(unmatched).toBeDefined();
    expect(unmatched!.files[0].path).toBe("README.md");
  });

  it("returns empty array for empty diff", () => {
    const result = parseDiff("", COMPONENTS);
    expect(result).toHaveLength(0);
  });
});
