// Clipwise Interactive Documentation & Demo Engine
document.addEventListener("DOMContentLoaded", () => {
  initGitHubReleaseDownloader();
  initInteractiveDemo();
});

// 1. Fetch latest GitHub release assets (.exe, .msi, portable)
async function initGitHubReleaseDownloader() {
  const repo = "jojin1709/Clipwise";
  const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
  const defaultFallbackUrl = `https://github.com/${repo}/releases/latest`;

  const btnNsis = document.getElementById("btn-download-nsis");
  const btnPortable = document.getElementById("btn-download-portable");
  const btnMsi = document.getElementById("btn-download-msi");
  const heroDownloadBtn = document.getElementById("hero-download-btn");
  const releaseVersionPill = document.getElementById("release-version-pill");

  try {
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const tag = data.tag_name || "v0.1.0";
    if (releaseVersionPill) {
      releaseVersionPill.innerHTML = `<span class="dot"></span> Latest: <strong>${tag}</strong> (${new Date(data.published_at || Date.now()).toLocaleDateString()})`;
    }

    const assets = data.assets || [];

    // Find NSIS installer (.exe)
    const nsisAsset = assets.find(a => a.name.endsWith(".exe") && (a.name.includes("setup") || a.name.includes("Setup")));
    // Find Portable executable
    const portableAsset = assets.find(a => a.name.endsWith("-portable.exe") || (a.name.endsWith(".exe") && !a.name.includes("setup")));
    // Find MSI installer
    const msiAsset = assets.find(a => a.name.endsWith(".msi"));

    if (nsisAsset && btnNsis) {
      const sizeMb = (nsisAsset.size / (1024 * 1024)).toFixed(1);
      btnNsis.href = nsisAsset.browser_download_url;
      btnNsis.innerHTML = `⬇️ Download Installer (.exe) <small style="opacity:0.75; font-size:11px;">(${sizeMb} MB)</small>`;
      if (heroDownloadBtn) heroDownloadBtn.href = nsisAsset.browser_download_url;
    } else if (portableAsset && btnNsis) {
      const sizeMb = (portableAsset.size / (1024 * 1024)).toFixed(1);
      btnNsis.href = portableAsset.browser_download_url;
      btnNsis.innerHTML = `⬇️ Download .exe <small style="opacity:0.75; font-size:11px;">(${sizeMb} MB)</small>`;
      if (heroDownloadBtn) heroDownloadBtn.href = portableAsset.browser_download_url;
    }

    if (portableAsset && btnPortable) {
      const sizeMb = (portableAsset.size / (1024 * 1024)).toFixed(1);
      btnPortable.href = portableAsset.browser_download_url;
      btnPortable.innerHTML = `⬇️ Download Portable (.exe) <small style="opacity:0.75; font-size:11px;">(${sizeMb} MB)</small>`;
    }

    if (msiAsset && btnMsi) {
      const sizeMb = (msiAsset.size / (1024 * 1024)).toFixed(1);
      btnMsi.href = msiAsset.browser_download_url;
      btnMsi.innerHTML = `⬇️ Download MSI Package (.msi) <small style="opacity:0.75; font-size:11px;">(${sizeMb} MB)</small>`;
    }
  } catch (err) {
    console.warn("Could not fetch release assets from GitHub API:", err);
    // Graceful fallback to GitHub Releases page
    if (releaseVersionPill) {
      releaseVersionPill.innerHTML = `<span class="dot"></span> Latest: <strong>GitHub Release</strong> (v0.1.x)`;
    }
    if (btnNsis) btnNsis.href = defaultFallbackUrl;
    if (btnPortable) btnPortable.href = defaultFallbackUrl;
    if (btnMsi) btnMsi.href = defaultFallbackUrl;
    if (heroDownloadBtn) heroDownloadBtn.href = defaultFallbackUrl;
  }
}

// 2. Interactive Autonomous Agent Simulation in the Browser
function initInteractiveDemo() {
  const urlInput = document.getElementById("demo-url-input");
  const runBtn = document.getElementById("demo-run-btn");
  const resetBtn = document.getElementById("demo-reset-btn");
  const cursor = document.getElementById("virtual-cursor");
  const stage = document.getElementById("demo-stage");
  const hud = document.getElementById("demo-hud");
  const hudTitle = document.getElementById("hud-title");
  const hudSub = document.getElementById("hud-sub");
  const simTextarea = document.getElementById("sim-textarea");
  const toast = document.getElementById("sim-toast");
  const quickPills = document.querySelectorAll(".pick-pill");

  let isRunning = false;
  let abortController = null;

  // Bezier curve point interpolation
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

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Animate cursor along Bezier curve
  async function moveCursorTo(targetX, targetY, durationMs = 800) {
    const startX = parseFloat(cursor.style.left) || 200;
    const startY = parseFloat(cursor.style.top) || 300;

    const midX = (startX + targetX) / 2 + (Math.random() - 0.5) * 50;
    const midY = (startY + targetY) / 2 + (Math.random() - 0.5) * 50;

    const steps = Math.max(16, Math.floor(durationMs / 18));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const pt = bezierPoint({ x: startX, y: startY }, { x: midX, y: startY }, { x: midX, y: targetY }, { x: targetX, y: targetY }, t);
      cursor.style.left = `${pt.x}px`;
      cursor.style.top = `${pt.y}px`;
      await sleep(18);
    }
    cursor.style.left = `${targetX}px`;
    cursor.style.top = `${targetY}px`;
  }

  // Trigger click ripple
  async function clickAt(x, y) {
    cursor.style.transform = "scale(0.82)";
    const ripple = document.createElement("div");
    ripple.className = "click-ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    stage.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);

    await sleep(120);
    cursor.style.transform = "scale(1)";
  }

  function updateHud(title, sub) {
    hudTitle.textContent = title;
    hudSub.textContent = sub;
    hud.style.opacity = "1";
    hud.style.transform = "translateY(0)";
  }

  // Type text character by character into simulated textarea
  async function typeTextInto(el, text) {
    el.value = "";
    for (let i = 0; i < text.length; i++) {
      el.value += text[i];
      await sleep(35 + Math.random() * 40);
    }
  }

  async function runSimulation() {
    if (isRunning) return;
    isRunning = true;
    runBtn.disabled = true;
    runBtn.textContent = "Agent Running...";

    const targetUrl = urlInput.value || "https://demo.clipwise.app/text-studio";
    let hostname = "demo.clipwise.app";
    try {
      hostname = new URL(targetUrl).hostname;
    } catch {
      hostname = "demo.clipwise.app";
    }

    // Reset initial positions
    cursor.style.left = "420px";
    cursor.style.top = "360px";
    cursor.style.display = "block";
    simTextarea.value = "";
    toast.classList.remove("show");

    // Stage 1: Browser Launch & Omnibox typing
    updateHud("Opening Browser", `Navigating to ${hostname}`);
    await sleep(600);

    // Stage 2: Discovering features
    updateHud("Analyzing Site", "Discovered interactive text tools & conversion buttons");
    await sleep(900);

    // Stage 3: Move cursor to simulated textarea
    const stageRect = stage.getBoundingClientRect();
    const areaRect = simTextarea.getBoundingClientRect();
    const areaX = areaRect.left - stageRect.left + 80;
    const areaY = areaRect.top - stageRect.top + 50;

    updateHud("Text Studio", "Typing realistic input to test live tool transformation");
    await moveCursorTo(areaX, areaY, 900);
    await clickAt(areaX, areaY);
    simTextarea.focus();

    const sampleText = "Clipwise generates stunning product showcases automatically! Try UPPERCASE and Title Case.";
    await typeTextInto(simTextarea, sampleText);
    await sleep(1000);

    // Stage 4: Move to UPPER CASE button
    const btnUpper = document.getElementById("sim-btn-upper");
    const upperRect = btnUpper.getBoundingClientRect();
    const upperX = upperRect.left - stageRect.left + upperRect.width / 2;
    const upperY = upperRect.top - stageRect.top + upperRect.height / 2;

    updateHud("Text Studio", 'Triggering tool action: "UPPER CASE"');
    await moveCursorTo(upperX, upperY, 800);
    await clickAt(upperX, upperY);
    btnUpper.classList.add("active");

    // Text mutation on screen
    simTextarea.value = simTextarea.value.toUpperCase();
    await sleep(1600);
    btnUpper.classList.remove("active");

    // Stage 5: Move to Title Case button
    const btnTitle = document.getElementById("sim-btn-title");
    const titleRect = btnTitle.getBoundingClientRect();
    const titleX = titleRect.left - stageRect.left + titleRect.width / 2;
    const titleY = titleRect.top - stageRect.top + titleRect.height / 2;

    updateHud("Text Studio", 'Triggering tool action: "Title Case"');
    await moveCursorTo(titleX, titleY, 700);
    await clickAt(titleX, titleY);
    btnTitle.classList.add("active");

    // Title case mutation
    simTextarea.value = simTextarea.value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    await sleep(1600);
    btnTitle.classList.remove("active");

    // Stage 6: Copy to Clipboard
    const btnCopy = document.getElementById("sim-btn-copy");
    const copyRect = btnCopy.getBoundingClientRect();
    const copyX = copyRect.left - stageRect.left + copyRect.width / 2;
    const copyY = copyRect.top - stageRect.top + copyRect.height / 2;

    updateHud("Text Studio", 'Triggering tool action: "Copy to clipboard"');
    await moveCursorTo(copyX, copyY, 650);
    await clickAt(copyX, copyY);
    toast.classList.add("show");
    await sleep(1800);
    toast.classList.remove("show");

    // Stage 7: Showcase Complete
    updateHud("Showcase Complete", `${hostname} • Exporting 1080p MP4 (54.6s)`);
    await sleep(2200);

    isRunning = false;
    runBtn.disabled = false;
    runBtn.innerHTML = `<span>▶</span> Run Simulation`;
  }

  function resetSimulation() {
    isRunning = false;
    runBtn.disabled = false;
    runBtn.innerHTML = `<span>▶</span> Run Simulation`;
    simTextarea.value = "Click 'Run Simulation' to watch the autonomous Clipwise agent type sample text and interact with tools live.";
    cursor.style.left = "420px";
    cursor.style.top = "360px";
    toast.classList.remove("show");
    updateHud("Agent Ready", "Choose a website or click Run Simulation");
  }

  runBtn.addEventListener("click", runSimulation);
  resetBtn.addEventListener("click", resetSimulation);

  quickPills.forEach(pill => {
    pill.addEventListener("click", () => {
      quickPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      urlInput.value = pill.dataset.url;
      resetSimulation();
      runSimulation();
    });
  });

  // Set default initial textarea text
  resetSimulation();
}
