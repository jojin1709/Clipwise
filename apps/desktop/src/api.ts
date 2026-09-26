import type { Feature } from "@clipwise/shared";

const API = "http://127.0.0.1:37771";

export async function health() {
  const r = await fetch(`${API}/health`);
  if (!r.ok) throw new Error("Browser service unavailable");
  return r.json();
}

export async function analyze(url: string, style: string, aspectRatio: string) {
  const r = await fetch(`${API}/api/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, maxPages: 8, maxDepth: 2, style, aspectRatio, useOllama: true })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Analysis failed");
  return data as { runId: string; result: { pages: unknown[] }; features: Feature[]; plan: unknown };
}

export async function record(url: string, workflow: unknown[], pacing: "quick" | "standard" | "deep" = "standard") {
  const r = await fetch(`${API}/api/record`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, workflow, pacing })
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Recording failed");
  return data as { runId: string; video: string | null; mp4: string | null; videoUrl: string | null; renderError?: string | null };
}

export async function getProgress() {
  try {
    const r = await fetch(`${API}/api/progress`);
    if (!r.ok) return null;
    return r.json() as Promise<{
      active: boolean;
      phase: string;
      stepIndex: number;
      totalSteps: number;
      percent: number;
      sectionName: string;
      message: string;
    }>;
  } catch {
    return null;
  }
}

