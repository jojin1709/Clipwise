// Clipwise Interactive Documentation & Demo Engine
document.addEventListener("DOMContentLoaded", () => {
  initAppleIntelligenceAurora();
  initGitHubReleaseDownloader();
  initInteractiveDemo();
  initScrollReveal();
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

const DOWNLOAD_SVG = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
`;

const PLAY_SVG = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
`;

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
      btnNsis.innerHTML = `${DOWNLOAD_SVG} <span>Download Installer (.exe)</span> <small style="opacity:0.75; font-size:11px;">(${sizeMb} MB)</small>`;
      if (heroDownloadBtn) heroDownloadBtn.href = nsisAsset.browser_download_url;
    } else if (portableAsset && btnNsis) {
      const sizeMb = (portableAsset.size / (1024 * 1024)).toFixed(1);
      btnNsis.href = portableAsset.browser_download_url;
      btnNsis.innerHTML = `${DOWNLOAD_SVG} <span>Download .exe</span> <small style="opacity:0.75; font-size:11px;">(${sizeMb} MB)</small>`;
      if (heroDownloadBtn) heroDownloadBtn.href = portableAsset.browser_download_url;
    }

    if (portableAsset && btnPortable) {
      const sizeMb = (portableAsset.size / (1024 * 1024)).toFixed(1);
      btnPortable.href = portableAsset.browser_download_url;
      btnPortable.innerHTML = `${DOWNLOAD_SVG} <span>Download Portable (.exe)</span> <small style="opacity:0.75; font-size:11px;">(${sizeMb} MB)</small>`;
    }

    if (msiAsset && btnMsi) {
      const sizeMb = (msiAsset.size / (1024 * 1024)).toFixed(1);
      btnMsi.href = msiAsset.browser_download_url;
      btnMsi.innerHTML = `${DOWNLOAD_SVG} <span>Download MSI Package (.msi)</span> <small style="opacity:0.75; font-size:11px;">(${sizeMb} MB)</small>`;
    }
  } catch (err) {
    console.warn("Could not fetch release assets from GitHub API:", err);
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
  const omniboxBox = document.getElementById("demo-omnibox-box");

  // Dynamic elements in simulated app
  const toolTitle = document.getElementById("sim-tool-title");
  const toolSub = document.getElementById("sim-tool-sub");
  const btnUpper = document.getElementById("sim-btn-upper");
  const btnTitle = document.getElementById("sim-btn-title");
  const btnCopy = document.getElementById("sim-btn-copy");

  let isRunning = false;

  // Preset Configurations
  const PRESET_CONFIGS = {
    text: {
      url: "https://demo.clipwise.app/text-studio",
      title: "Interactive Text Formatter",
      sub: "Easily convert any text into uppercase, title case, or lower case in a single click.",
      btn1: "UPPER CASE",
      btn2: "Title Case",
      btn3: "Copy to clipboard",
      sample: "Clipwise generates stunning product showcases automatically! Try UPPERCASE and Title Case."
    },
    analytics: {
      url: "https://demo.clipwise.app/analytics",
      title: "SaaS Growth & Revenue Dashboard",
      sub: "Inspect real-time conversions, daily active metrics, and revenue charts.",
      btn1: "Quarterly View",
      btn2: "Export Report",
      btn3: "Filter Segment",
      sample: "Monthly Recurring Revenue: $48,250 (+18.4% growth). Active teams: 1,420."
    },
    markdown: {
      url: "https://demo.clipwise.app/markdown",
      title: "AI Markdown & Documentation Studio",
      sub: "Instant typography preview with live syntax highlighting and documentation generation.",
      btn1: "Bold Format",
      btn2: "Heading H1",
      btn3: "Render Preview",
      sample: "# Product Showcase\n\n- Automated browser recording\n- Human mouse curves\n- 1080p MP4 export"
    },
    calculator: {
      url: "https://demo.clipwise.app/calculator",
      title: "Financial ROI & Mortgage Calculator",
      sub: "Simulate monthly interest rates, loan terms, and total financial return on investment.",
      btn1: "Calculate ROI",
      btn2: "Amortize Schedule",
      btn3: "Export Breakdown",
      sample: "Investment Capital: $100,000 | Annual Projected Return: 14.5% | Total 5-Yr Yield: $196,800"
    }
  };

  let currentPreset = PRESET_CONFIGS.text;

  function setPreset(key) {
    currentPreset = PRESET_CONFIGS[key] || PRESET_CONFIGS.text;
    urlInput.value = currentPreset.url;
    toolTitle.textContent = currentPreset.title;
    toolSub.textContent = currentPreset.sub;
    btnUpper.querySelector("span").textContent = currentPreset.btn1;
    btnTitle.querySelector("span").textContent = currentPreset.btn2;
    btnCopy.querySelector("span").textContent = currentPreset.btn3;
    simTextarea.value = "Click 'Run Simulation' to watch the autonomous Clipwise agent type sample text and interact with tools live.";
  }

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

  async function typeTextInto(el, text) {
    el.value = "";
    for (let i = 0; i < text.length; i++) {
      el.value += text[i];
      await sleep(30 + Math.random() * 35);
    }
  }

  async function runSimulation() {
    if (isRunning) return;
    isRunning = true;
    runBtn.disabled = true;
    runBtn.innerHTML = `<span>Agent Running...</span>`;

    const targetUrl = urlInput.value || currentPreset.url;
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
    if (omniboxBox) omniboxBox.classList.add("focus-ring");
    await sleep(700);
    if (omniboxBox) omniboxBox.classList.remove("focus-ring");

    // Stage 2: Discovering features
    updateHud("Analyzing Site", "Discovered interactive tools & conversion buttons");
    await sleep(800);

    // Stage 3: Move cursor to simulated textarea
    const stageRect = stage.getBoundingClientRect();
    const areaRect = simTextarea.getBoundingClientRect();
    const areaX = areaRect.left - stageRect.left + 80;
    const areaY = areaRect.top - stageRect.top + 50;

    updateHud(currentPreset.title, "Typing realistic input to test live tool transformation");
    await moveCursorTo(areaX, areaY, 850);
    await clickAt(areaX, areaY);
    simTextarea.focus();

    await typeTextInto(simTextarea, currentPreset.sample);
    await sleep(1000);

    // Stage 4: Move to Button 1
    const upperRect = btnUpper.getBoundingClientRect();
    const upperX = upperRect.left - stageRect.left + upperRect.width / 2;
    const upperY = upperRect.top - stageRect.top + upperRect.height / 2;

    updateHud(currentPreset.title, `Triggering tool action: "${currentPreset.btn1}"`);
    await moveCursorTo(upperX, upperY, 750);
    await clickAt(upperX, upperY);
    btnUpper.classList.add("active");

    // Text mutation on screen
    simTextarea.value = simTextarea.value.toUpperCase();
    await sleep(1500);
    btnUpper.classList.remove("active");

    // Stage 5: Move to Button 2
    const titleRect = btnTitle.getBoundingClientRect();
    const titleX = titleRect.left - stageRect.left + titleRect.width / 2;
    const titleY = titleRect.top - stageRect.top + titleRect.height / 2;

    updateHud(currentPreset.title, `Triggering tool action: "${currentPreset.btn2}"`);
    await moveCursorTo(titleX, titleY, 700);
    await clickAt(titleX, titleY);
    btnTitle.classList.add("active");

    // Title case mutation
    simTextarea.value = simTextarea.value.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    await sleep(1500);
    btnTitle.classList.remove("active");

    // Stage 6: Copy / Trigger action 3
    const copyRect = btnCopy.getBoundingClientRect();
    const copyX = copyRect.left - stageRect.left + copyRect.width / 2;
    const copyY = copyRect.top - stageRect.top + copyRect.height / 2;

    updateHud(currentPreset.title, `Triggering tool action: "${currentPreset.btn3}"`);
    await moveCursorTo(copyX, copyY, 650);
    await clickAt(copyX, copyY);
    toast.classList.add("show");
    await sleep(1800);
    toast.classList.remove("show");

    // Stage 7: Showcase Complete
    updateHud("Showcase Complete", `${hostname} • Exporting 1080p MP4 (54.6s)`);
    await sleep(2000);

    isRunning = false;
    runBtn.disabled = false;
    runBtn.innerHTML = `${PLAY_SVG} <span>Run Simulation</span>`;
  }

  function resetSimulation() {
    isRunning = false;
    runBtn.disabled = false;
    runBtn.innerHTML = `${PLAY_SVG} <span>Run Simulation</span>`;
    simTextarea.value = "Click 'Run Simulation' to watch the autonomous Clipwise agent type sample text and interact with tools live.";
    cursor.style.left = "420px";
    cursor.style.top = "360px";
    toast.classList.remove("show");
    updateHud("Agent Ready", "Choose a preset or click Run Simulation");
  }

  runBtn.addEventListener("click", runSimulation);
  resetBtn.addEventListener("click", resetSimulation);

  quickPills.forEach(pill => {
    pill.addEventListener("click", () => {
      quickPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const type = pill.dataset.type || "text";
      setPreset(type);
      resetSimulation();
      runSimulation();
    });
  });

  setPreset("text");
  resetSimulation();
}

// 3. Scroll Reveal Animation Observer
function initScrollReveal() {
  const reveals = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    reveals.forEach(el => el.classList.add("active"));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: "0px 0px -40px 0px"
  });

  reveals.forEach(el => observer.observe(el));
}

// 4. Apple Intelligence / Siri-Style Fluid Aurora Wave Engine
function initAppleIntelligenceAurora() {
  const canvas = document.getElementById("bg-aurora");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let width, height;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  function resize() {
    width = canvas.width = Math.floor(window.innerWidth * dpr * 0.75);
    height = canvas.height = Math.floor(window.innerHeight * dpr * 0.75);
  }

  resize();
  window.addEventListener("resize", resize);

  let mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, active: false };

  window.addEventListener("mousemove", (e) => {
    mouse.targetX = (e.clientX / window.innerWidth) * width;
    mouse.targetY = (e.clientY / window.innerHeight) * height;
    mouse.active = true;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });

  // Layered Apple Intelligence Wave Definitions
  const waves = [
    {
      // Violet to Iris Wave
      colorStart: "rgba(99, 102, 241, 0.45)",
      colorMid: "rgba(139, 92, 246, 0.40)",
      colorEnd: "rgba(236, 72, 153, 0.35)",
      yBase: 0.35,
      amplitude: 110,
      wavelength: 0.0022,
      speed: 0.0008,
      thickness: 180,
      phase: 0,
      harmonics: [
        { freq: 0.0012, speed: 0.0014, amp: 45 },
        { freq: 0.0028, speed: -0.0010, amp: 25 }
      ]
    },
    {
      // Cyan to Electric Indigo
      colorStart: "rgba(6, 182, 212, 0.45)",
      colorMid: "rgba(59, 130, 246, 0.42)",
      colorEnd: "rgba(99, 102, 241, 0.35)",
      yBase: 0.42,
      amplitude: 130,
      wavelength: 0.0018,
      speed: -0.0007,
      thickness: 200,
      phase: 2.1,
      harmonics: [
        { freq: 0.0016, speed: -0.0012, amp: 55 },
        { freq: 0.0032, speed: 0.0009, amp: 30 }
      ]
    },
    {
      // Neon Magenta to Sunset Amber
      colorStart: "rgba(236, 72, 153, 0.40)",
      colorMid: "rgba(244, 63, 94, 0.36)",
      colorEnd: "rgba(251, 146, 60, 0.32)",
      yBase: 0.48,
      amplitude: 100,
      wavelength: 0.0026,
      speed: 0.0009,
      thickness: 170,
      phase: 4.2,
      harmonics: [
        { freq: 0.0014, speed: 0.0016, amp: 40 },
        { freq: 0.0038, speed: -0.0014, amp: 20 }
      ]
    },
    {
      // Deep Luminous Iris Glow Wave
      colorStart: "rgba(124, 58, 237, 0.38)",
      colorMid: "rgba(99, 102, 241, 0.35)",
      colorEnd: "rgba(14, 165, 233, 0.30)",
      yBase: 0.55,
      amplitude: 120,
      wavelength: 0.0020,
      speed: -0.0006,
      thickness: 220,
      phase: 1.2,
      harmonics: [
        { freq: 0.0018, speed: -0.0011, amp: 50 },
        { freq: 0.0025, speed: 0.0013, amp: 35 }
      ]
    }
  ];

  let time = 0;

  function render() {
    time += 1;

    // Smooth mouse position damping
    mouse.x += (mouse.targetX - mouse.x) * 0.08;
    mouse.y += (mouse.targetY - mouse.y) * 0.08;

    ctx.clearRect(0, 0, width, height);

    // Additive screen blend mode for glowing iridescent light interaction
    ctx.globalCompositeOperation = "screen";

    const segments = 45;
    const stepX = width / segments;

    waves.forEach((w) => {
      const centerY = height * w.yBase;
      const grad = ctx.createLinearGradient(0, centerY - w.thickness, width, centerY + w.thickness);
      grad.addColorStop(0, w.colorStart);
      grad.addColorStop(0.5, w.colorMid);
      grad.addColorStop(1, w.colorEnd);

      ctx.fillStyle = grad;
      ctx.beginPath();

      // Top wave curve
      for (let i = 0; i <= segments; i++) {
        const x = i * stepX;
        let y = centerY;

        // Primary wave
        y += Math.sin(x * w.wavelength + time * w.speed + w.phase) * w.amplitude;

        // Harmonics
        w.harmonics.forEach(h => {
          y += Math.sin(x * h.freq + time * h.speed) * h.amp;
        });

        // Mouse displacement
        if (mouse.active) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 260) {
            const force = (1 - dist / 260);
            y += Math.sin(dist * 0.03 - time * 0.05) * force * 55;
          }
        }

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      // Bottom return curve to form filled ribbon
      for (let i = segments; i >= 0; i--) {
        const x = i * stepX;
        let y = centerY + w.thickness;

        y += Math.sin(x * w.wavelength + time * w.speed + w.phase + 0.8) * (w.amplitude * 0.85);

        w.harmonics.forEach(h => {
          y += Math.cos(x * h.freq + time * h.speed) * (h.amp * 0.8);
        });

        if (mouse.active) {
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 260) {
            const force = (1 - dist / 260);
            y += Math.cos(dist * 0.03 - time * 0.05) * force * 45;
          }
        }

        ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.fill();
    });

    requestAnimationFrame(render);
  }

  render();
}
