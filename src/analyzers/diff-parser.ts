import type { ComponentDiff, FileDiff } from "../core/types.js";

interface ComponentConfig {
  name: string;
  paths: string[];
}

/**
 * Parse a unified diff string into per-component file groups.
 * Files that don't match any component config are grouped under "unmatched".
 */
export function parseDiff(diff: string, components: ComponentConfig[]): ComponentDiff[] {
  const files = parseUnifiedDiff(diff);
  const componentMap = new Map<string, FileDiff[]>();

  for (const file of files) {
    const component = matchComponent(file.path, components);
    const name = component?.name ?? "unmatched";

    if (!componentMap.has(name)) {
      componentMap.set(name, []);
    }
    componentMap.get(name)!.push(file);
  }

  return Array.from(componentMap.entries()).map(([component, files]) => ({
    component,
    files,
  }));
}

/**
 * Parse a unified diff into individual file diffs.
 */
function parseUnifiedDiff(diff: string): FileDiff[] {
  const files: FileDiff[] = [];
  const fileSections = diff.split(/^diff --git /m).filter(Boolean);

  for (const section of fileSections) {
    const pathMatch = section.match(/^a\/(.+?) b\/(.+)/m);
    if (!pathMatch) continue;

    const path = pathMatch[2];
    let additions = 0;
    let deletions = 0;
    const patchLines: string[] = [];

    const lines = section.split("\n");
    let inHunk = false;

    for (const line of lines) {
      if (line.startsWith("@@")) {
        inHunk = true;
        patchLines.push(line);
        continue;
      }
      if (!inHunk) continue;

      patchLines.push(line);
      if (line.startsWith("+") && !line.startsWith("+++")) additions++;
      if (line.startsWith("-") && !line.startsWith("---")) deletions++;
    }

    files.push({ path, additions, deletions, patch: patchLines.join("\n") });
  }

  return files;
}

/**
 * Match a file path against component path patterns.
 * Supports glob-like patterns with ** and *.
 */
function matchComponent(
  filePath: string,
  components: ComponentConfig[],
): ComponentConfig | undefined {
  for (const component of components) {
    for (const pattern of component.paths) {
      if (globMatch(filePath, pattern)) {
        return component;
      }
    }
  }
  return undefined;
}

/**
 * Simple glob matcher supporting ** (any path) and * (any segment).
 */
function globMatch(filePath: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{DOUBLE}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{DOUBLE\}\}/g, ".*");

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(filePath);
}
