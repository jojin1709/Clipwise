import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { assertSafeTarget } from "./security.js";

const VIRTUAL_CURSOR_SCRIPT = `
(() => {
  if (window.__clipwise_injected) return;
  window.__clipwise_injected = true;

  // Virtual cursor dot
  const cursor = document.createElement('div');
  cursor.id = 'clipwise-virtual-cursor';
  cursor.style.cssText = [
    'position: fixed',
    'width: 20px',
    'height: 20px',
    'border-radius: 50%',
    'background: rgba(99, 102, 241, 0.9)',
    'border: 2px solid #ffffff',
    'box-shadow: 0 0 16px rgba(99, 102, 241, 0.8), 0 2px 8px rgba(0,0,0,0.5)',
    'pointer-events: none',
    'z-index: 99999999',
    'transition: transform 0.12s ease-out',
    'transform: translate(-50%, -50%)',
    'left: 50%',
    'top: 50%'
  ].join(';');
  document.documentElement.appendChild(cursor);

  window.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  }, { passive: true });

  window.addEventListener('click', e => {
    const ripple = document.createElement('div');
    ripple.style.cssText = [
      'position: fixed',
      'width: 36px',
      'height: 36px',
      'border-radius: 50%',
      'border: 3px solid #6366f1',
      'pointer-events: none',
      'z-index: 99999998',
      'transform: translate(-50%, -50%) scale(0.4)',
      'opacity: 1',
      'transition: transform 0.45s ease-out, opacity 0.45s ease-out',
      'left: ' + e.clientX + 'px',
      'top: ' + e.clientY + 'px'
    ].join(';');
    document.documentElement.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%, -50%) scale(2.0)';
      ripple.style.opacity = '0';
    });
    setTimeout(() => ripple.remove(), 500);
  }, { passive: true });
})();
`;

async function showHud(page, title, subtitle) {
  try {
    await page.evaluate(({ title, subtitle }) => {
      let hud = document.getElementById("clipwise-hud");
      if (!hud) {
        hud = document.createElement("div");
        hud.id = "clipwise-hud";
        hud.style.cssText = [
          "position: fixed",
          "bottom: 32px",
          "left: 32px",
          "display: flex",
          "align-items: center",
          "gap: 14px",
          "padding: 12px 22px",
          "background: rgba(13, 17, 23, 0.94)",
          "backdrop-filter: blur(14px)",
          "border: 1px solid rgba(99, 102, 241, 0.5)",
          "border-radius: 12px",
          "box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7)",
          "font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          "z-index: 99999990",
          "transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
          "opacity: 0",
          "transform: translateY(20px)"
        ].join(";");
        document.documentElement.appendChild(hud);
      }
      hud.innerHTML = `
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">CLIPWISE TOUR</div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 16px; font-weight: 700; color: #ffffff; line-height: 1.25;">${title}</span>
          ${subtitle ? `<span style="font-size: 13px; color: #94a3b8; line-height: 1.25; margin-top: 2px;">${subtitle}</span>` : ""}
        </div>
      `;
      requestAnimationFrame(() => {
        hud.style.opacity = "1";
        hud.style.transform = "translateY(0)";
      });
    }, { title, subtitle });
  } catch {
    // ignore hud injection errors
  }
}

async function smoothScroll(page, amount, durationMs = 2500) {
  try {
    await page.evaluate(async ({ amount, durationMs }) => {
      return new Promise(resolve => {
        const start = window.scrollY;
        const startTime = performance.now();
        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          // Smooth easeInOutQuad curve
          const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
          window.scrollTo(0, start + amount * ease);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(step);
      });
    }, { amount, durationMs });
  } catch {
    // fallback to standard scroll
    await page.mouse.wheel(0, amount);
  }
  await page.waitForTimeout(600);
}

async function performAction(page, action, baseUrl, pacingMultiplier = 1.0) {
  try {
    if (action.action === "banner") {
      await showHud(page, action.title, action.subtitle);
      await page.waitForTimeout(1000);
      return;
    }

    if (action.action === "goto") {
      const target = new URL(action.url, baseUrl);
      if (target.origin !== new URL(baseUrl).origin) {
        console.warn(`Skipping navigation outside origin: ${target.origin}`);
        return;
      }
      try {
        await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 25000 });
      } catch {
        // Retry with load if domcontentloaded timed out
        await page.goto(target.href, { waitUntil: "load", timeout: 15000 }).catch(() => {});
      }
      // Wait for client rendering & fonts
      await page.waitForTimeout(1800 * pacingMultiplier);
      return;
    }

    if (action.action === "wait") {
      const waitTime = Math.max(300, (action.ms || 1000) * pacingMultiplier);
      await page.waitForTimeout(waitTime);
      return;
    }

    if (action.action === "smoothScroll") {
      const duration = Math.max(1000, (action.duration || 2500) * pacingMultiplier);
      await smoothScroll(page, action.amount || 600, duration);
      return;
    }

    if (action.action === "scroll") {
      await smoothScroll(page, action.pixels || 500, 1800 * pacingMultiplier);
      return;
    }

    if (action.action === "click") {
      const locator = action.role
        ? page.getByRole(action.role, { name: action.name, exact: false }).first()
        : page.getByText(action.name, { exact: false }).first();
      await locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(500);
      await locator.click({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(1000 * pacingMultiplier);
      return;
    }

    if (action.action === "fill") {
      const locator = action.role
        ? page.getByRole(action.role, { name: action.name, exact: false }).first()
        : page.locator(`input[name="${action.name.replace(/"/g, "")}"]`).first();
      await locator.scrollIntoViewIfNeeded({ timeout: 4000 }).catch(() => {});
      await locator.fill(action.value, { timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(800 * pacingMultiplier);
      return;
    }
  } catch (error) {
    console.warn(`Action failed (${action.action}):`, error.message);
  }
}

export async function recordWorkflow({ url, workflow, runDir, pacing = "standard" }) {
  const safe = await assertSafeTarget(url);
  await fs.mkdir(runDir, { recursive: true });

  // Pacing multipliers:
  // quick: 0.7x (crisp 1-2 min video)
  // standard: 1.2x (3-5 min full walkthrough)
  // deep: 2.8x (10-20 min in-depth presentation)
  const pacingMultiplier = pacing === "deep" ? 2.8 : pacing === "quick" ? 0.7 : 1.2;

  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: runDir, size: { width: 1440, height: 900 } }
  });

  // Inject virtual glowing cursor & click ripples on all loaded pages
  await context.addInitScript(VIRTUAL_CURSOR_SCRIPT);

  const page = await context.newPage();

  try {
    for (const action of workflow) {
      await performAction(page, action, safe.href, pacingMultiplier);
    }

    // Outro presentation card
    await showHud(page, "Showcase Complete", `${new URL(url).hostname} • Generated with Clipwise`);
    await page.waitForTimeout(3000 * pacingMultiplier);
  } finally {
    await context.close();
    await browser.close();
  }

  const files = await fs.readdir(runDir);
  const video = files.find(f => f.endsWith(".webm"));
  return video ? path.join(runDir, video) : null;
}
