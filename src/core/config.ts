import { z } from "zod";
import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

const subdomainSchema = z.enum(["core", "supporting", "generic"]);

const componentSchema = z.object({
  name: z.string(),
  paths: z.array(z.string()),
  subdomain: subdomainSchema.default("supporting"),
  bus_factor_threshold: z.number().int().positive().default(2),
  owners: z.array(z.string()).optional(),
});

const levelConfigSchema = z.object({
  weight: z.number().min(0).max(2).default(1.0),
  enabled: z.boolean().default(true),
});

const severitySchema = z.object({
  low: z.string().default("0-25"),
  medium: z.string().default("26-50"),
  high: z.string().default("51-75"),
  critical: z.string().default("76+"),
});

const thresholdsSchema = z.object({
  levels: z
    .object({
      requirements: levelConfigSchema.default({}),
      specification: levelConfigSchema.default({}),
      implementation: levelConfigSchema.default({}),
      validation: levelConfigSchema.default({}),
    })
    .default({}),
  severity: severitySchema.default({}),
});

const llmjSchema = z.object({
  provider: z.string().default("openai"),
  model: z.string().default("gpt-4o-mini"),
  max_questions_per_level: z.number().int().positive().default(2),
  temperature: z.number().min(0).max(1).default(0.3),
  rubric_version: z.number().int().default(1),
});

const analyzersSchema = z.object({
  complexity: z
    .object({
      engine: z.enum(["heuristic", "tree-sitter"]).default("heuristic"),
      languages: z.array(z.string()).default(["typescript"]),
    })
    .default({}),
  coupling: z
    .object({
      enabled: z.boolean().default(false),
      import_depth: z.number().int().default(2),
    })
    .default({}),
});

const ledgerSchema = z.object({
  enabled: z.boolean().default(false),
  path: z.string().default(".ed-says-ledger.json"),
  max_entries: z.number().int().default(1000),
});

const outputSchema = z.object({
  comment: z.boolean().default(true),
  check_run: z.boolean().default(false),
  annotations: z.boolean().default(false),
});

export const configSchema = z.object({
  version: z.number().int().default(1),
  components: z.array(componentSchema).default([]),
  thresholds: thresholdsSchema.default({}),
  llmj: llmjSchema.default({}),
  analyzers: analyzersSchema.default({}),
  ledger: ledgerSchema.default({}),
  output: outputSchema.default({}),
});

export async function loadConfig(configPath: string): Promise<z.infer<typeof configSchema>> {
  let raw: unknown = {};

  try {
    const content = await readFile(configPath, "utf-8");
    raw = parseYaml(content);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw new Error(`Failed to read config at ${configPath}: ${err}`);
    }
    // No config file — use defaults
  }

  return configSchema.parse(raw);
}
