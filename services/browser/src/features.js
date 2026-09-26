export function discoverFeatures(result) {
  const features = [];
  const add = (feature) => {
    if (!features.some(f => f.id === feature.id)) features.push(feature);
  };

  for (const page of result.pages) {
    const text = `${page.title} ${page.headings.join(" ")} ${page.buttons.join(" ")} ${page.bodyText || ""}`.toLowerCase();

    if (page.inputs.some(i => ["search", "query"].some(k => `${i.name} ${i.placeholder}`.toLowerCase().includes(k))) ||
        /\bsearch\b/.test(text)) {
      add({
        id: "search",
        name: "Search",
        description: "Search functionality detected on the site.",
        importance: "high",
        confidence: 0.86,
        sourcePage: page.url,
        evidence: ["Search text or search input detected."],
        workflow: [
          { action: "goto", url: page.url },
          { action: "wait", ms: 500 }
        ]
      });
    }

    if (page.inputs.length > 0 || /\b(filter|sort|category)\b/.test(text)) {
      add({
        id: "forms-filters",
        name: "Forms & Filters",
        description: "Interactive inputs, filters, or selection controls were detected.",
        importance: "medium",
        confidence: 0.78,
        sourcePage: page.url,
        evidence: [`${page.inputs.length} input/control fields detected.`],
        workflow: [{ action: "goto", url: page.url }]
      });
    }

    if (page.links.length >= 3) {
      add({
        id: "navigation",
        name: "Navigation",
        description: "Multiple internal navigation paths were detected.",
        importance: "medium",
        confidence: 0.82,
        sourcePage: page.url,
        evidence: [`${page.links.length} links detected.`],
        workflow: [{ action: "goto", url: page.url }]
      });
    }

    if (/\b(upload|attach|choose file|drop file)\b/.test(text)) {
      add({
        id: "upload",
        name: "Upload",
        description: "A file-upload capability appears to be available.",
        importance: "high",
        confidence: 0.79,
        sourcePage: page.url,
        evidence: ["Upload-related text detected."],
        workflow: [{ action: "goto", url: page.url }]
      });
    }

    if (/\b(dashboard|overview|analytics|statistics|stats)\b/.test(text)) {
      add({
        id: "dashboard",
        name: "Dashboard / Analytics",
        description: "Dashboard or analytics content was detected.",
        importance: "high",
        confidence: 0.81,
        sourcePage: page.url,
        evidence: ["Dashboard/analytics terminology detected."],
        workflow: [{ action: "goto", url: page.url }]
      });
    }

    if (/\b(login|sign in|log in|create account|sign up)\b/.test(text)) {
      add({
        id: "authentication",
        name: "Authentication",
        description: "Authentication UI was detected. Clipwise will not bypass or submit it automatically.",
        importance: "low",
        confidence: 0.92,
        sourcePage: page.url,
        evidence: ["Authentication terminology detected."],
        workflow: [{ action: "goto", url: page.url }]
      });
    }
  }

  if (!features.length) {
    add({
      id: "homepage",
      name: "Homepage",
      description: "The main website page and its visible content.",
      importance: "high",
      confidence: 0.9,
      sourcePage: result.startUrl,
      evidence: ["Default homepage feature."],
      workflow: [{ action: "goto", url: result.startUrl }]
    });
  }

  return features;
}
