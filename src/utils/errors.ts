export class EdSaysError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "EdSaysError";
  }
}

export class ConfigError extends EdSaysError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

export class AnalysisError extends EdSaysError {
  constructor(message: string) {
    super(message, "ANALYSIS_ERROR");
    this.name = "AnalysisError";
  }
}

export class GitHubError extends EdSaysError {
  constructor(message: string) {
    super(message, "GITHUB_ERROR");
    this.name = "GitHubError";
  }
}
