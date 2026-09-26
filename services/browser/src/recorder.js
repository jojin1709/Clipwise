import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { assertSafeTarget } from "./security.js";

function safeName(value) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 60) || "scene";
}

async function performAction(page, action, baseUrl) {
  if (action.action === "goto") {
    const target = new URL(action.url, baseUrl);
    if (target.origin !== new URL(baseUrl).origin) throw new Error("Workflow navigation left the starting origin.");
    await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 30000 });
    return;
  }
  if (action.action === "wait") {
    await page.waitForTimeout(action.ms);
    return;
  }
  if (action.action === "scroll") {
    await page.mouse.wheel(0, action.pixels);
    await page.waitForTimeout(400);
    return;
  }
  if (action.action === "click") {
    const locator = action.role
      ? page.getByRole(action.role, { name: action.name, exact: false }).first()
      : page.getByText(action.name, { exact: false }).first();
    await locator.click({ timeout: 8000 });
    await page.waitForTimeout(700);
    return;
  }
  if (action.action === "fill") {
    const locator = action.role
      ? page.getByRole(action.role, { name: action.name, exact: false }).first()
      : page.locator(`input[name="${action.name.replace(/"/g, "")}"]`).first();
    await locator.fill(action.value);
    return;
  }
  throw new Error(`Unsupported action: ${action.action}`);
}

export async function recordWorkflow({ url, workflow, runDir }) {
  const safe = await assertSafeTarget(url);
  await fs.mkdir(runDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: runDir, size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();

  try {
    for (const action of workflow) {
      await performAction(page, action, safe.href);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const files = await fs.readdir(runDir);
  const video = files.find(f => f.endsWith(".webm"));
  return video ? path.join(runDir, video) : null;
}
