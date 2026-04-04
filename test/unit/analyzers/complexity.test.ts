import { describe, it, expect } from "vitest";
import { computeFileComplexity } from "../../../src/analyzers/complexity.js";

describe("computeFileComplexity", () => {
  it("returns 0 for a patch with no control flow", () => {
    const patch = `@@ -1,1 +1,3 @@
+const x = 1;
+const y = 2;
+const z = x + y;`;

    expect(computeFileComplexity(patch)).toBe(0);
  });

  it("counts if statements", () => {
    const patch = `@@ -1,1 +1,5 @@
+if (x > 0) {
+  doSomething();
+} else {
+  doOther();
+}`;

    const complexity = computeFileComplexity(patch);
    expect(complexity).toBeGreaterThan(0);
    // if (+1) + else (+1) = at least 2
    expect(complexity).toBeGreaterThanOrEqual(2);
  });

  it("increases complexity with nesting", () => {
    const flat = `@@ -1,1 +1,3 @@
+if (a) {
+  doA();
+}`;

    const nested = `@@ -1,1 +1,5 @@
+if (a) {
+  if (b) {
+    doAB();
+  }
+}`;

    const flatComplexity = computeFileComplexity(flat);
    const nestedComplexity = computeFileComplexity(nested);

    expect(nestedComplexity).toBeGreaterThan(flatComplexity);
  });

  it("counts logical operators", () => {
    const patch = `@@ -1,1 +1,3 @@
+if (a && b || c) {
+  doSomething();
+}`;

    const complexity = computeFileComplexity(patch);
    // if (+1) + && (+1) + || (+1) = at least 3
    expect(complexity).toBeGreaterThanOrEqual(3);
  });

  it("counts ternary expressions", () => {
    const patch = `@@ -1,1 +1,1 @@
+const result = condition ? valueA : valueB;`;

    const complexity = computeFileComplexity(patch);
    expect(complexity).toBeGreaterThanOrEqual(1);
  });

  it("counts for/while loops", () => {
    const patch = `@@ -1,1 +1,5 @@
+for (let i = 0; i < n; i++) {
+  while (items.length) {
+    process(items.pop());
+  }
+}`;

    const complexity = computeFileComplexity(patch);
    // for (+1) + while (+2, nesting=1) = at least 3
    expect(complexity).toBeGreaterThanOrEqual(3);
  });

  it("ignores context lines (no + prefix)", () => {
    const patch = `@@ -1,3 +1,4 @@
 if (existing) {
   doExisting();
 }
+const newLine = true;`;

    // Only the added line should count, and it has no control flow
    expect(computeFileComplexity(patch)).toBe(0);
  });
});
