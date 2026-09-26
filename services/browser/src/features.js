function cleanTitle(title, url) {
  if (!title) {
    const path = new URL(url).pathname.replace(/^\/|\/$/g, "");
    if (!path) return "Homepage & Overview";
    return path.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  return title.split(/[-|•–]/)[0].trim();
}

export function discoverFeatures(result) {
  const features = [];
  const add = (feature) => {
    if (!features.some(f => f.id === feature.id)) features.push(feature);
  };

  const pages = result.pages || [];

  // 1. Generate a dedicated Tour Section for every explored page
  pages.forEach((page, idx) => {
    const title = cleanTitle(page.title, page.url);
    const slug = new URL(page.url).pathname.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
    const headingsList = (page.headings || []).slice(0, 3).join(" • ");
    const isHome = idx === 0 || page.url === result.startUrl;

    const workflow = [
      {
        action: "banner",
        title: title,
        subtitle: isHome ? "Main Overview & Highlights" : (headingsList || "Explore Tools & Features")
      },
      { action: "goto", url: page.url },
      { action: "wait", ms: 3000 },
      { action: "smoothScroll", amount: 650, duration: 2800 },
      { action: "wait", ms: 2200 },
      { action: "smoothScroll", amount: 800, duration: 3200 },
      { action: "wait", ms: 2500 },
      { action: "smoothScroll", amount: -500, duration: 2500 },
      { action: "wait", ms: 1800 }
    ];

    add({
      id: `section-${idx + 1}-${slug}`,
      name: `${isHome ? "🏠 " : "📂 "}${title}`,
      description: headingsList ? `Section content: ${headingsList}` : `Exploration of ${page.url}`,
      importance: isHome ? "high" : "medium",
      confidence: 0.96,
      sourcePage: page.url,
      evidence: [
        `${(page.headings || []).length} headings`,
        `${(page.buttons || []).length} interactive buttons`,
        `${(page.links || []).length} internal links`
      ],
      workflow
    });
  });

  // 2. Search Capability Discovery
  for (const page of pages) {
    const text = `${page.title} ${(page.headings || []).join(" ")} ${(page.buttons || []).join(" ")}`.toLowerCase();
    const hasSearchInput = (page.inputs || []).some(i =>
      ["search", "query", "q"].some(k => `${i.name} ${i.placeholder}`.toLowerCase().includes(k))
    );

    if (hasSearchInput || /\bsearch\b/.test(text)) {
      add({
        id: "search-capability",
        name: "🔍 Search & Discovery",
        description: "Interactive search filters and catalog lookup.",
        importance: "high",
        confidence: 0.89,
        sourcePage: page.url,
        evidence: ["Search inputs or search keywords detected."],
        workflow: [
          { action: "banner", title: "Search & Discovery", subtitle: "Instant catalog and tool lookup" },
          { action: "goto", url: page.url },
          { action: "wait", ms: 2500 },
          { action: "smoothScroll", amount: 400, duration: 2000 },
          { action: "wait", ms: 2000 }
        ]
      });
      break;
    }
  }

  // Fallback if no pages were extracted
  if (!features.length) {
    add({
      id: "homepage-overview",
      name: "🏠 Homepage Tour",
      description: "Full tour of the main landing page and its features.",
      importance: "high",
      confidence: 0.95,
      sourcePage: result.startUrl,
      evidence: ["Primary entrypoint."],
      workflow: [
        { action: "banner", title: "Product Overview", subtitle: "Welcome Tour" },
        { action: "goto", url: result.startUrl },
        { action: "wait", ms: 3000 },
        { action: "smoothScroll", amount: 700, duration: 3000 },
        { action: "wait", ms: 2500 },
        { action: "smoothScroll", amount: 900, duration: 3500 },
        { action: "wait", ms: 2500 }
      ]
    });
  }

  return features;
}
