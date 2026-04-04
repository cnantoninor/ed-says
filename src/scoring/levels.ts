import type { Level } from "../core/types.js";

export interface LevelDefinition {
  level: Level;
  label: string;
  description: string;
  sampleQuestions: string[];
  signal: string;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  {
    level: "requirements",
    label: "Requirements",
    description: "Intent clarity — does the author understand what business need the PR addresses?",
    sampleQuestions: [
      "What business need does this PR address? What would break if it didn't exist?",
      "Who are the stakeholders for this change and what are their expectations?",
    ],
    signal: "Intent clarity",
  },
  {
    level: "specification",
    label: "Specification",
    description:
      "Design understanding — does the author understand the contracts and interfaces involved?",
    sampleQuestions: [
      "What contracts or interfaces does this PR implement or change? What are the invariants?",
      "How does this change affect the public API surface?",
    ],
    signal: "Design understanding",
  },
  {
    level: "implementation",
    label: "Implementation",
    description:
      "Warrant quality — does the author understand why this approach was chosen and what the edge cases are?",
    sampleQuestions: [
      "Why this approach over alternatives? What are the edge cases the implementation handles?",
      "What are the performance implications of this implementation?",
    ],
    signal: "Warrant quality",
  },
  {
    level: "validation",
    label: "Validation",
    description:
      "Epistemic closure — does the author understand what the tests cover and what they miss?",
    sampleQuestions: [
      "What edge cases do the tests cover? Could you name a scenario they'd miss?",
      "How would you know if this change introduced a regression?",
    ],
    signal: "Epistemic closure",
  },
];
