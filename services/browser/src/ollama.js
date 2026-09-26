export async function generateShowcasePlan({ model, features, startUrl, style = "startup", aspectRatio = "16:9" }) {
  const base = process.env.CLIPWISE_OLLAMA_URL || "http://127.0.0.1:11434";
  const prompt = `You are a product-demo planner. Return ONLY valid JSON.
Website: ${startUrl}
Style: ${style}
Aspect ratio: ${aspectRatio}
Features:
${JSON.stringify(features, null, 2)}

Create a concise showcase plan with 3-7 scenes. Do not invent capabilities. Use only supplied features.
Schema:
{"title":"string","style":"startup|github|portfolio|tutorial|launch|social","aspectRatio":"16:9|9:16|1:1","scenes":[{"id":"string","title":"string","description":"string","duration":5,"narration":"string","actions":[...],"featureId":"string"}]}`;

  const response = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, format: "json" })
  });
  if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.response);
}

export function generateFallbackPlan({ features, startUrl, style = "startup", aspectRatio = "16:9" }) {
  const host = new URL(startUrl).hostname.replace(/^www\./, "");
  const scenes = [];

  // Scene 1: Introduction
  scenes.push({
    id: "scene-intro",
    title: `Welcome to ${host}`,
    description: `Opening presentation introducing the core value proposition of ${host}.`,
    duration: 4,
    narration: `Welcome to ${host}. Let's take a look at what it has to offer.`,
    actions: [{ action: "goto", url: startUrl }, { action: "wait", ms: 1200 }]
  });

  // Scenes for top features
  const selectedFeatures = features.slice(0, 5);
  selectedFeatures.forEach((feat, idx) => {
    scenes.push({
      id: `scene-${feat.id || idx + 1}`,
      featureId: feat.id,
      title: feat.name,
      description: feat.description,
      duration: 5,
      narration: `Here we explore ${feat.name}: ${feat.description}`,
      actions: feat.workflow && feat.workflow.length > 0 ? feat.workflow : [{ action: "goto", url: feat.sourcePage || startUrl }]
    });
  });

  // Outro scene
  scenes.push({
    id: "scene-outro",
    title: "Conclusion & Call to Action",
    description: "Final overview and closing statement.",
    duration: 3,
    narration: `Experience ${host} today and see how it streamlines your workflow.`,
    actions: [{ action: "wait", ms: 1500 }]
  });

  return {
    title: `${host} Product Showcase`,
    style,
    aspectRatio,
    scenes,
    fallback: true
  };
}

