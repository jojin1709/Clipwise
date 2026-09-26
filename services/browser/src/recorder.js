import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { assertSafeTarget } from "./security.js";

const VIRTUAL_CURSOR_SCRIPT = `
(() => {
  function injectCursor() {
    if (document.getElementById('clipwise-virtual-cursor')) return;

    const cursorWrap = document.createElement('div');
    cursorWrap.id = 'clipwise-virtual-cursor';
    cursorWrap.style.cssText = [
      'position: fixed',
      'width: 32px',
      'height: 32px',
      'pointer-events: none',
      'z-index: 2147483647',
      'left: 720px',
      'top: 450px',
      'transform: translate(0, 0)',
      'transition: transform 0.08s ease-out',
      'will-change: left, top, transform',
      'display: block'
    ].join(';');

    cursorWrap.innerHTML = \`
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.65)) drop-shadow(0 0 10px rgba(99,102,241,0.85));">
        <path d="M5.5 3.2V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.88c.45 0 .67-.54.35-.85L5.85 2.85a.5.5 0 0 0-.35.35z" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <div style="position: absolute; top: 0; left: 0; width: 8px; height: 8px; border-radius: 50%; background: #6366f1; box-shadow: 0 0 10px #818cf8;"></div>
    \`;
    (document.body || document.documentElement).appendChild(cursorWrap);
  }

  window.__clipwise_moveCursor = (x, y) => {
    injectCursor();
    const c = document.getElementById('clipwise-virtual-cursor');
    if (c) {
      c.style.left = x + 'px';
      c.style.top = y + 'px';
      c.style.display = 'block';
    }
  };

  window.__clipwise_clickRipple = (x, y) => {
    injectCursor();
    const c = document.getElementById('clipwise-virtual-cursor');
    if (c) {
      c.style.transform = 'scale(0.82)';
      setTimeout(() => { c.style.transform = 'scale(1)'; }, 140);
    }

    const ripple = document.createElement('div');
    ripple.style.cssText = [
      'position: fixed',
      'width: 44px',
      'height: 44px',
      'border-radius: 50%',
      'border: 2.5px solid #818cf8',
      'background: rgba(99, 102, 241, 0.3)',
      'box-shadow: 0 0 16px rgba(99, 102, 241, 0.9)',
      'pointer-events: none',
      'z-index: 2147483646',
      'transform: translate(-50%, -50%) scale(0.25)',
      'opacity: 1',
      'transition: transform 0.45s ease-out, opacity 0.45s ease-out',
      'left: ' + x + 'px',
      'top: ' + y + 'px'
    ].join(';');
    (document.body || document.documentElement).appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%, -50%) scale(2.2)';
      ripple.style.opacity = '0';
    });
    setTimeout(() => ripple.remove(), 480);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCursor);
  } else {
    injectCursor();
  }
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
          "bottom: 30px",
          "left: 30px",
          "display: flex",
          "align-items: center",
          "gap: 14px",
          "padding: 12px 20px",
          "background: rgba(13, 17, 23, 0.94)",
          "backdrop-filter: blur(14px)",
          "border: 1px solid rgba(99, 102, 241, 0.55)",
          "border-radius: 12px",
          "box-shadow: 0 12px 35px rgba(0, 0, 0, 0.75)",
          "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          "z-index: 2147483640",
          "transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          "opacity: 0",
          "transform: translateY(18px)"
        ].join(";");
        (document.body || document.documentElement).appendChild(hud);
      }
      hud.innerHTML = `
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; padding: 5px 11px; border-radius: 6px; text-transform: uppercase;">CLIPWISE AGENT</div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 15px; font-weight: 700; color: #ffffff; line-height: 1.25;">${title}</span>
          ${subtitle ? `<span style="font-size: 13px; color: #94a3b8; line-height: 1.25; margin-top: 3px;">${subtitle}</span>` : ""}
        </div>
      `;
      requestAnimationFrame(() => {
        hud.style.opacity = "1";
        hud.style.transform = "translateY(0)";
      });
    }, { title, subtitle });
  } catch {
    // ignore
  }
}

// Track mouse position across page actions
let mousePos = { x: 720, y: 450 };

function bezierPoint(p0, p1, p2, p3, t) {
  const cx = 3 * (p1.x - p0.x);
  const bx = 3 * (p2.x - p1.x) - cx;
  const ax = p3.x - p0.x - cx - bx;

  const cy = 3 * (p1.y - p0.y);
  const by = 3 * (p2.y - p1.y) - cy;
  const ay = p3.y - p0.y - cy - by;

  const xt = ax * Math.pow(t, 3) + bx * Math.pow(t, 2) + cx * t + p0.x;
  const yt = ay * Math.pow(t, 3) + by * Math.pow(t, 2) + cy * t + p0.y;

  return { x: xt, y: yt };
}

async function humanMove(page, toX, toY, steps = 24) {
  try {
    const start = { ...mousePos };
    const jitterX = (Math.random() - 0.5) * 35;
    const jitterY = (Math.random() - 0.5) * 35;
    const midX = (start.x + toX) / 2 + jitterX;
    const midY = (start.y + toY) / 2 + jitterY;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const pt = bezierPoint(start, { x: midX, y: start.y }, { x: midX, y: toY }, { x: toX, y: toY }, t);
      await page.evaluate(({ x, y }) => {
        if (window.__clipwise_moveCursor) window.__clipwise_moveCursor(x, y);
      }, { x: pt.x, y: pt.y }).catch(() => {});
      await page.mouse.move(pt.x, pt.y);
      await page.waitForTimeout(14);
    }
    mousePos = { x: toX, y: toY };
  } catch {
    // ignore
  }
}

async function humanClick(page, target) {
  try {
    const el = typeof target === "string" ? page.locator(target).first() : target;
    await el.scrollIntoViewIfNeeded({ timeout: 3500 }).catch(() => {});
    const box = await el.boundingBox();
    if (!box) {
      await el.click({ timeout: 3500 }).catch(() => {});
      return false;
    }

    const targetX = box.x + box.width / 2 + (Math.random() - 0.5) * Math.min(10, box.width * 0.3);
    const targetY = box.y + box.height / 2 + (Math.random() - 0.5) * Math.min(8, box.height * 0.3);

    await humanMove(page, targetX, targetY);
    await page.waitForTimeout(220);

    // Trigger visual click ripple & down/up
    await page.evaluate(({ x, y }) => {
      if (window.__clipwise_clickRipple) window.__clipwise_clickRipple(x, y);
    }, { x: targetX, y: targetY }).catch(() => {});

    await page.mouse.down();
    await page.waitForTimeout(90);
    await page.mouse.up();
    await page.waitForTimeout(600);
    return true;
  } catch {
    return false;
  }
}

async function humanType(page, target, text) {
  try {
    await humanClick(page, target);
    await page.waitForTimeout(250);

    for (const char of text) {
      await page.keyboard.type(char, { delay: 35 + Math.random() * 45 });
    }
    await page.waitForTimeout(500);
  } catch {
    const el = typeof target === "string" ? page.locator(target).first() : target;
    await el.fill(text).catch(() => {});
  }
}

async function smoothScroll(page, amount, durationMs = 2400) {
  try {
    await page.evaluate(async ({ amount, durationMs }) => {
      return new Promise(resolve => {
        const start = window.scrollY;
        const startTime = performance.now();
        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
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
    await page.mouse.wheel(0, amount);
  }
  await page.waitForTimeout(600);
}

// 1. Simulate browser opening, address bar focus, and typing the target URL
async function simulateBrowserLaunchAndTypeUrl(page, targetUrl, pacingMultiplier = 1.0) {
  try {
    const parsed = new URL(targetUrl);
    const host = parsed.hostname;

    const startHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #090d16;
            color: #f8fafc;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            user-select: none;
          }
          .browser-chrome {
            background: #0f172a;
            border-bottom: 1px solid #1e293b;
            padding: 10px 18px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            position: relative;
          }
          .window-dots {
            display: flex;
            gap: 8px;
          }
          .dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }
          .dot.red { background: #ef4444; }
          .dot.yellow { background: #eab308; }
          .dot.green { background: #22c55e; }
          .tab-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #1e293b;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            color: #cbd5e1;
          }
          .omnibox {
            flex: 1;
            max-width: 720px;
            display: flex;
            align-items: center;
            gap: 10px;
            background: #090d16;
            border: 1.5px solid #334155;
            border-radius: 10px;
            padding: 8px 16px;
            transition: all 0.25s ease;
          }
          .omnibox.active {
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
          }
          .omnibox input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #ffffff;
            font-size: 14px;
            font-family: monospace;
          }
          .omnibox input::placeholder {
            color: #64748b;
          }
          .load-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            width: 0%;
            background: linear-gradient(90deg, #6366f1, #a855f7);
            transition: width 0.8s ease-in-out;
          }
          .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: radial-gradient(circle at 50% 40%, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
          }
          .logo-badge {
            width: 70px;
            height: 70px;
            border-radius: 18px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
            margin-bottom: 20px;
          }
          h2 { font-size: 26px; font-weight: 700; margin-bottom: 8px; }
          p { color: #94a3b8; font-size: 15px; }
        </style>
      </head>
      <body>
        <div class="browser-chrome">
          <div class="window-dots">
            <span class="dot red"></span>
            <span class="dot yellow"></span>
            <span class="dot green"></span>
          </div>
          <div class="tab-bar">
            <span>🌐</span>
            <span>New Tab</span>
          </div>
          <div class="omnibox" id="url-box">
            <span style="font-size: 14px; color: #22c55e;">🔒</span>
            <input id="url-input" type="text" placeholder="Search or type a web address..." readonly />
            <span style="font-size: 13px; color: #64748b;">↵</span>
          </div>
          <div class="load-bar" id="load-bar"></div>
        </div>
        <div class="main-content">
          <div class="logo-badge">⚡</div>
          <h2>Ready to Explore</h2>
          <p>Navigating to live application showcase</p>
        </div>
      </body>
      </html>
    `;

    await page.setContent(startHtml);
    await page.waitForTimeout(600 * pacingMultiplier);

    // Initial mouse center position
    mousePos = { x: 720, y: 520 };
    await page.evaluate(({ x, y }) => {
      if (window.__clipwise_moveCursor) window.__clipwise_moveCursor(x, y);
    }, { x: mousePos.x, y: mousePos.y });

    await showHud(page, "Opening Browser", `Navigating to ${host}`);

    // Smoothly move mouse up to the omnibox address bar
    const omnibox = page.locator("#url-box");
    const box = await omnibox.boundingBox();
    if (box) {
      await humanMove(page, box.x + 120, box.y + box.height / 2, 24);
      await page.waitForTimeout(200);

      // Click to focus address bar
      await humanClick(page, "#url-box");

      await page.evaluate(() => {
        document.getElementById("url-box").classList.add("active");
      });
      await page.waitForTimeout(300);

      // Type URL character by character
      const fullUrl = targetUrl;
      for (let i = 0; i < fullUrl.length; i++) {
        await page.evaluate(({ typed }) => {
          document.getElementById("url-input").value = typed;
        }, { typed: fullUrl.slice(0, i + 1) });
        await page.waitForTimeout(25 + Math.random() * 45);
      }

      await page.waitForTimeout(350 * pacingMultiplier);

      // Enter action & loading progress animation
      await page.evaluate(() => {
        document.getElementById("load-bar").style.width = "90%";
      });
      await page.waitForTimeout(650 * pacingMultiplier);
    }
  } catch (err) {
    console.warn("simulateBrowserLaunchAndTypeUrl error:", err.message);
  }
}

// 2. Autonomous hands-on user demonstration of website features
async function executeHandsOnDemo(page, action, pacingMultiplier = 1.0) {
  try {
    const sectionTitle = action.title || "Feature Overview";

    // A. Interactive Tool & Textarea Demonstration (typing text & clicking action buttons)
    const textarea = page.locator("textarea:visible").first();
    const hasTextarea = (await textarea.count().catch(() => 0)) > 0;

    const mainInput = page.locator("input[type=text]:visible, input[type=search]:visible, input:not([type]):visible").first();
    const hasInput = (await mainInput.count().catch(() => 0)) > 0;

    if (hasTextarea) {
      await showHud(page, sectionTitle, "Typing realistic input to test live tool transformation");
      await page.waitForTimeout(600);

      const demoSamples = [
        "Clipwise generates stunning product showcases automatically! Try UPPERCASE and Title Case.",
        "explore live text transformations, instant calculators, and interactive web tools with ease.",
        "The quick brown fox jumps over the lazy dog. 1234567890."
      ];
      const sampleText = demoSamples[Math.floor(Math.random() * demoSamples.length)];

      await humanType(page, textarea, sampleText);
      await page.waitForTimeout(1400 * pacingMultiplier);

      // Discover action buttons on the page
      const buttons = page.locator("button:visible");
      const buttonCount = await buttons.count().catch(() => 0);
      const allButtons = [];

      for (let b = 0; b < Math.min(buttonCount, 16); b++) {
        const btn = buttons.nth(b);
        const name = (await btn.textContent().catch(() => "")).trim();
        if (
          name &&
          name.length > 1 &&
          name.length < 28 &&
          !/explore|all tools|back|home|delete|remove|clear|dark|light|login|sign|menu|share/i.test(name)
        ) {
          allButtons.push({ btn, name });
        }
      }

      // Prioritize transformation buttons: UPPER CASE, Title Case, lower case, Convert, Generate
      const transformPriority = /upper|title|paragraph|lower|toggle|convert|generate|calculate|format|count|transform|run/i;
      allButtons.sort((a, b) => {
        const aPri = transformPriority.test(a.name) ? 1 : 0;
        const bPri = transformPriority.test(b.name) ? 1 : 0;
        return bPri - aPri;
      });

      let actionClicks = 0;
      for (const { btn, name } of allButtons) {
        await showHud(page, sectionTitle, `Triggering tool action: "${name}"`);
        await humanClick(page, btn);
        // Wait so the viewer clearly watches the transformed output live in the video!
        await page.waitForTimeout(1800 * pacingMultiplier);
        actionClicks++;
        if (actionClicks >= 3) break;
      }
    } else if (hasInput) {
      // Test search bar or filter input
      await showHud(page, sectionTitle, "Testing interactive search filter & discovery");
      await page.waitForTimeout(600);
      await humanType(page, mainInput, "calculator");
      await page.waitForTimeout(1600 * pacingMultiplier);

      const searchItem = page.locator("a:visible, div[role=option]:visible").filter({ hasText: /calculator|converter|tool/i }).first();
      if ((await searchItem.count().catch(() => 0)) > 0) {
        const sBox = await searchItem.boundingBox().catch(() => null);
        if (sBox) {
          await humanMove(page, sBox.x + sBox.width / 2, sBox.y + sBox.height / 2);
          await page.waitForTimeout(1200 * pacingMultiplier);
        }
      }
    }

    // B. Category Tabs & Segmented Filters (clicking different categories)
    const tabs = page.locator("button[role=tab]:visible, .tab:visible, .filter-btn:visible, button.category:visible").filter({
      hasText: /Text|Web|Developer|All|Popular|Tools|Calc|Format|PDF|Unit/i
    });
    const tabCount = await tabs.count().catch(() => 0);
    if (tabCount > 1) {
      for (let t = 0; t < Math.min(tabCount, 2); t++) {
        const tab = tabs.nth(t);
        const tabText = (await tab.textContent().catch(() => "")).trim();
        if (tabText) {
          await showHud(page, sectionTitle, `Switching category tab: "${tabText}"`);
          await humanClick(page, tab);
          await page.waitForTimeout(1500 * pacingMultiplier);
        }
      }
    }

    // C. Tool Cards & Feature Tiles (hovering with realistic Bezier curves)
    const cards = page.locator("a:visible, div[role=button]:visible, .card:visible").filter({
      hasText: /Converter|Generator|Calculator|Format|Editor|Extractor|Compress|Counter|Viewer/i
    });
    const cardCount = await cards.count().catch(() => 0);

    for (let c = 0; c < Math.min(cardCount, 3); c++) {
      const card = cards.nth(c);
      const box = await card.boundingBox().catch(() => null);
      if (box && box.width > 60 && box.height > 30 && box.y > 60 && box.y < 850) {
        const cardTitle = (await card.textContent().catch(() => "")).slice(0, 32).trim();
        if (cardTitle) {
          await showHud(page, sectionTitle, `Showcasing feature: ${cardTitle}`);
        }
        await humanMove(page, box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(1100 * pacingMultiplier);
      }
    }

    // D. Accordions / FAQs / Collapsible details (expanding to show content)
    const accordion = page.locator("summary:visible, [aria-expanded=false]:visible, .accordion-button:visible").first();
    if ((await accordion.count().catch(() => 0)) > 0) {
      await showHud(page, sectionTitle, "Expanding details & feature documentation");
      await humanClick(page, accordion);
      await page.waitForTimeout(1600 * pacingMultiplier);
    }

    // E. Natural Exploration Scrolling (smooth pacing with pauses)
    await smoothScroll(page, 520, 2400 * pacingMultiplier);
    await page.waitForTimeout(1200 * pacingMultiplier);
    await smoothScroll(page, 620, 2600 * pacingMultiplier);
    await page.waitForTimeout(1400 * pacingMultiplier);
    await smoothScroll(page, -420, 2200 * pacingMultiplier);
    await page.waitForTimeout(1000 * pacingMultiplier);
  } catch (err) {
    console.warn("Hands-on demo exception:", err.message);
  }
}

async function performAction(page, action, baseUrl, pacingMultiplier = 1.0) {
  try {
    if (action.action === "banner") {
      await showHud(page, action.title, action.subtitle);
      await page.waitForTimeout(1200 * pacingMultiplier);
      return;
    }

    if (action.action === "goto") {
      const target = new URL(action.url, baseUrl);
      if (target.origin !== new URL(baseUrl).origin) return;

      try {
        await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 25000 });
      } catch {
        await page.goto(target.href, { waitUntil: "load", timeout: 15000 }).catch(() => {});
      }
      await page.waitForTimeout(1800 * pacingMultiplier);
      return;
    }

    if (action.action === "handsOnDemo") {
      await executeHandsOnDemo(page, action, pacingMultiplier);
      return;
    }

    if (action.action === "smoothScroll") {
      const duration = Math.max(1000, (action.duration || 2500) * pacingMultiplier);
      await smoothScroll(page, action.amount || 600, duration);
      return;
    }

    if (action.action === "wait") {
      const waitTime = Math.max(300, (action.ms || 1000) * pacingMultiplier);
      await page.waitForTimeout(waitTime);
      return;
    }

    if (action.action === "click") {
      const locator = action.role
        ? page.getByRole(action.role, { name: action.name, exact: false }).first()
        : page.getByText(action.name, { exact: false }).first();
      await humanClick(page, locator);
      return;
    }

    if (action.action === "fill" || action.action === "type") {
      const locator = action.role
        ? page.getByRole(action.role, { name: action.name, exact: false }).first()
        : page.locator(`input[name="${action.name.replace(/"/g, "")}"]`).first();
      await humanType(page, locator, action.value);
      return;
    }
  } catch (error) {
    console.warn(`Action failed (${action.action}):`, error.message);
  }
}

export async function recordWorkflow({ url, workflow, runDir, pacing = "standard", onProgress }) {
  const safe = await assertSafeTarget(url);
  await fs.mkdir(runDir, { recursive: true });

  const pacingMultiplier = pacing === "deep" ? 2.5 : pacing === "quick" ? 0.75 : 1.2;

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
    // 1. First: Open browser, address bar, and type the URL in authentic user style
    if (onProgress) {
      onProgress({
        stepIndex: 1,
        totalSteps: workflow.length + 1,
        percent: 8,
        sectionName: "Opening Website",
        message: `Launching browser session & entering ${new URL(url).hostname}...`
      });
    }
    await simulateBrowserLaunchAndTypeUrl(page, url, pacingMultiplier);

    // 2. Execute each workflow section with hands-on user interaction
    let currentSection = "";
    for (let i = 0; i < workflow.length; i++) {
      const action = workflow[i];
      if (action.action === "banner") {
        currentSection = action.title || "";
      }
      const pct = Math.min(90, Math.round(((i + 1) / workflow.length) * 82) + 8);
      if (onProgress) {
        onProgress({
          stepIndex: i + 2,
          totalSteps: workflow.length + 1,
          percent: pct,
          sectionName: currentSection || "Exploring site",
          message: action.action === "goto" ? `Navigating to ${currentSection || action.url}...`
                 : action.action === "handsOnDemo" ? `Actively interacting with tools in ${currentSection}...`
                 : action.action === "smoothScroll" ? `Showcasing features in ${currentSection}...`
                 : `Demonstrating ${currentSection}...`
        });
      }
      await performAction(page, action, safe.href, pacingMultiplier);
    }

    // Outro presentation card
    await showHud(page, "Showcase Complete", `${new URL(url).hostname} • Generated with Clipwise`);
    await page.waitForTimeout(3200 * pacingMultiplier);
  } finally {
    await context.close();
    await browser.close();
  }

  const files = await fs.readdir(runDir);
  const video = files.find(f => f.endsWith(".webm"));
  return video ? path.join(runDir, video) : null;
}
