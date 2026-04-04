# Configuration Reference

Ed Says is configured via a `.ed-says.yml` file in your repository root.

## Full Schema

```yaml
# Required
version: 1

# Map your codebase to components with DDD subdomain classification
components:
  - name: "payments"           # Component identifier
    paths:                     # Glob patterns matching files
      - "src/domains/payments/**"
    subdomain: core            # core | supporting | generic
    bus_factor_threshold: 3    # N_req_k — minimum people who should understand
    owners:                    # Optional: team/user references
      - "@payments-team"

# Scoring configuration
thresholds:
  levels:
    requirements:
      weight: 1.0              # Multiplier for this level's debt contribution
      enabled: true            # Whether to analyze this level
    specification:
      weight: 0.8
      enabled: true
    implementation:
      weight: 1.0
      enabled: true
    validation:
      weight: 0.6
      enabled: true
  severity:                    # Debt score ranges for each band
    low: "0-25"
    medium: "26-50"
    high: "51-75"
    critical: "76+"

# LLM-as-Judge configuration (Phase 3, mode=full only)
llmj:
  provider: openai             # openai | anthropic | ollama
  model: gpt-4o-mini           # Model identifier
  max_questions_per_level: 2   # Questions per applicable level
  temperature: 0.3             # Lower = more consistent scoring
  rubric_version: 1            # Lock rubric for reproducibility

# Static analyzer settings
analyzers:
  complexity:
    engine: heuristic          # heuristic | tree-sitter
    languages:
      - typescript
      - python
  coupling:
    enabled: false             # Phase 2
    import_depth: 2

# Debt history tracking (Phase 2)
ledger:
  enabled: false
  path: .ed-says-ledger.json
  max_entries: 1000

# Output options
output:
  comment: true                # Post PR comment
  check_run: false             # Create GitHub Check Run (Phase 2)
  annotations: false           # Inline file annotations (future)
```

## Minimal Config

An empty config works — all fields have defaults:

```yaml
version: 1
components:
  - name: "app"
    paths: ["src/**"]
    subdomain: supporting
```

## Subdomain Defaults

| Subdomain | Default bus_factor_threshold | Meaning |
|-----------|---------------------------|---------|
| core | 2 | Critical business logic — at least 2 people must understand |
| supporting | 2 | Important but not differentiating |
| generic | 1 | Utilities, shared libs — 1 person suffices |
