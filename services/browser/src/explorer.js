import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { assertSafeTarget, sameOrigin } from "./security.js";

const DEFAULT_LIMITS = { maxPages: 8, maxDepth: 2 };

function normalizeUrl(url) {
  const u = new URL(url);
  u.hash = "";
  return u.href.replace(/\/$/, "");
}

export async function exploreWebsite({ url, maxPages = DEFAULT_LIMITS.maxPages, maxDepth = DEFAULT_LIMITS.maxDepth, runDir }) {
  const start = await assertSafeTarget(url);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: false });
  const page = await context.newPage();
  const queue = [{ url: normalizeUrl(start.href), depth: 0 }];
  const seen = new Set();
  const pages = [];

  await fs.mkdir(runDir, { recursive: true });

  try {
    while (queue.length && pages.length < Math.min(maxPages, 25)) {
      const current = queue.shift();
      if (seen.has(current.url) || current.depth > maxDepth) continue;
      seen.add(current.url);

      try {
        await page.goto(current.url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(600);

        const data = await page.evaluate(() => ({
          title: document.title,
          headings: [...document.querySelectorAll("h1,h2,h3")].map(x => (x.textContent || "").trim()).filter(Boolean).slice(0, 30),
          links: [...document.querySelectorAll("a[href]")].map(a => ({
            text: (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 160),
            href: a.href
          })).filter(x => x.text),
          buttons: [...document.querySelectorAll("button,[role=button]")].map(x => (x.textContent || x.getAttribute("aria-label") || "").trim()).filter(Boolean).slice(0, 50),
          inputs: [...document.querySelectorAll("input,textarea,select")].map(x => ({
            type: x.getAttribute("type") || x.tagName.toLowerCase(),
            name: x.getAttribute("name") || "",
            placeholder: x.getAttribute("placeholder") || ""
          })).slice(0, 30),
          bodyText: (document.body?.innerText || "").slice(0, 12000)
        }));

        const screenshotName = `page-${pages.length + 1}.png`;
        await page.screenshot({ path: path.join(runDir, screenshotName), fullPage: false });

        pages.push({
          url: page.url(),
          title: data.title,
          headings: data.headings,
          links: data.links,
          buttons: data.buttons,
          inputs: data.inputs,
          screenshot: path.join(runDir, screenshotName),
          depth: current.depth,
          bodyText: data.bodyText
        });

        for (const link of data.links) {
          if (queue.length + pages.length >= maxPages * 3) break;
          if (sameOrigin(start.href, link.href)) {
            const next = normalizeUrl(link.href);
            if (!seen.has(next) && !queue.some(q => q.url === next)) queue.push({ url: next, depth: current.depth + 1 });
          }
        }
      } catch (error) {
        pages.push({
          url: current.url,
          title: "Navigation error",
          headings: [],
          links: [],
          buttons: [],
          inputs: [],
          screenshot: "",
          depth: current.depth,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  } finally {
    await context.close();
    await browser.close();
  }

  return { startUrl: start.href, pages };
}
