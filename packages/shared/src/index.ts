import { z } from "zod";

export const ActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("goto"), url: z.string().url() }),
  z.object({ action: z.literal("click"), role: z.string().optional(), name: z.string().min(1) }),
  z.object({ action: z.literal("fill"), role: z.string().optional(), name: z.string().min(1), value: z.string().max(500) }),
  z.object({ action: z.literal("scroll"), pixels: z.number().min(-10000).max(10000) }),
  z.object({ action: z.literal("wait"), ms: z.number().int().min(0).max(10000) }),
]);

export type BrowserAction = z.infer<typeof ActionSchema>;

export const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
  maxPages: z.number().int().min(1).max(25).default(8),
  maxDepth: z.number().int().min(0).max(4).default(2),
});

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export interface PageSummary {
  url: string;
  title: string;
  headings: string[];
  links: { text: string; href: string }[];
  buttons: string[];
  inputs: { type: string; name: string; placeholder: string }[];
  screenshot?: string;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  importance: "high" | "medium" | "low";
  confidence: number;
  sourcePage: string;
  evidence: string[];
  workflow: BrowserAction[];
}

export interface ShowcaseScene {
  id: string;
  title: string;
  description: string;
  duration: number;
  actions: BrowserAction[];
  narration: string;
  featureId?: string;
}

export interface ShowcasePlan {
  title: string;
  style: "startup" | "github" | "portfolio" | "tutorial" | "launch" | "social";
  aspectRatio: "16:9" | "9:16" | "1:1";
  scenes: ShowcaseScene[];
}

export function validateActions(actions: unknown): BrowserAction[] {
  return z.array(ActionSchema).parse(actions);
}
