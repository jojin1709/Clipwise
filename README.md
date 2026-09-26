<div align="center">

# Clipwise

### Local-First AI Product Demo Generator — Turn Any Website URL into a Polished Video

**A real, native Windows desktop application built with Tauri 2, Rust, React, and Playwright** — Clipwise crawls your web application, discovers key features and interactive workflows, plans cinematic demo scenes using local Ollama LLMs or deterministic heuristic fallbacks, records browser interactions, and renders studio-quality MP4 demo videos using FFmpeg.

**100% Local-First** · **Zero Cloud API Subscriptions** · **Your Data Stays on Your Machine**

<br/>

[![License](https://img.shields.io/badge/License-MIT-0D1117?style=flat-square&labelColor=0D1117&color=6366F1)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2.8-0D1117?style=flat-square&labelColor=0D1117&logo=tauri&logoColor=24C8DB)](https://v2.tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-2021%20Edition-0D1117?style=flat-square&labelColor=0D1117&logo=rust&logoColor=DEA584)](https://www.rust-lang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-0D1117?style=flat-square&labelColor=0D1117&logo=typescript&logoColor=3178C6)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Chromium-0D1117?style=flat-square&labelColor=0D1117&logo=playwright&logoColor=2EAD33)](https://playwright.dev/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-H.264%20%7C%20AAC-0D1117?style=flat-square&labelColor=0D1117&logo=ffmpeg&logoColor=007808)](https://ffmpeg.org/)
[![Windows](https://img.shields.io/badge/Windows-10%20%7C%2011%20(x64)-0D1117?style=flat-square&labelColor=0D1117&logo=windows&logoColor=0078D4)](https://www.microsoft.com/windows)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-EA4AAA?style=flat-square&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/jojin1709)

<br/>

**Developed by [JOJIN JOHN](https://github.com/jojin1709)**

<br/>

</div>

---

## ⚡ What is Clipwise?

Traditional product demo video creation requires hours of screen recording, video editing software, and expensive cloud subscriptions. **Clipwise** automates the entire pipeline directly on your Windows PC:

1. **Automated Deep Crawl & Exploration** — Headless/Headed Chromium via Playwright navigates target sites up to configurable depths, capturing screenshots, DOM states, navigation trees, and call-to-actions.
2. **Intelligent Feature Discovery** — Discovers search bars, dashboards, auth screens, CTAs, navigation structures, and data displays with confidence ratings and semantic scoring.
3. **AI Scene & Script Planning** — Leverages your local Ollama instance (e.g. `qwen2.5:3b`, `llama3.2`, `mistral`) to structure a multi-scene showcase with timings and narration script. Includes a robust deterministic fallback planner if Ollama is not running.
4. **Automated Interaction Recording** — Executes the scripted plan step-by-step in an isolated Playwright browser context, capturing high-framerate video recordings.
5. **Hardware-Accelerated Video Rendering** — Compiles, transcode, and exports the final video to clean H.264 MP4 with FFmpeg, ready for your landing page, YouTube, X, or pitch deck.

---

## 💻 System Requirements & Specifications

Clipwise runs natively on Windows 10 and Windows 11. Below are the minimum hardware requirements and optimal hardware recommendations for running browser automation, local AI models, and video rendering simultaneously.

| Specification | Minimum Specification | Recommended / Maximum Specification |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 64-bit (Build 19041+) | Windows 11 64-bit (22H2 or newer) |
| **Processor (CPU)** | Intel Core i3 (8th Gen+) or AMD Ryzen 3 3000 series (4 Cores / 8 Threads) | Intel Core i7 / i9 (12th Gen+) or AMD Ryzen 7 / 9 (8+ Cores / 16+ Threads) |
| **Memory (RAM)** | 8 GB DDR4 | 16 GB – 32 GB DDR4 / DDR5 |
| **Graphics (GPU)** | Integrated Graphics (Intel UHD 620 / AMD Radeon Vega) | NVIDIA GeForce RTX 3060 / 4060 or higher (with 8GB+ VRAM for CUDA LLM acceleration) |
| **Storage (Disk)** | 10 GB free space (SSD recommended) | 50 GB+ free space NVMe M.2 SSD |
| **Video Engine** | FFmpeg 5.x+ (CPU software encoding `libx264`) | FFmpeg 6.x / 7.x (Hardware NVENC / QSV acceleration) |
| **Local LLM Engine** | Ollama with `qwen2.5:1.5b` or Heuristic Fallback (0 MB VRAM) | Ollama with `qwen2.5:7b` / `llama3.3:8b` GPU-accelerated |
| **Runtime Software** | Node.js 20+, Microsoft Edge WebView2 Evergreen | Node.js 22 LTS, Rust 1.85+, WebView2 Evergreen Runtime |

---

## 🛠️ Architecture & Technology Stack

```
Clipwise/
├── apps/
│   └── desktop/                 # Tauri 2 Desktop Shell + React Frontend
│       ├── src/                 # React 18, TypeScript, Zustand, Lucide Icons, Vanilla CSS
│       ├── src-tauri/           # Rust Core, Window Management, Native IPC
│       └── vite.config.ts       # Vite Bundler
├── services/
│   └── browser/                 # Headless Automation & Video Generation Engine
│       ├── src/
│       │   ├── server.js        # HTTP Microservice (Port 37771) with Run Artifacts Provider
│       │   ├── explorer.js      # Playwright Site Crawler & DOM Analyzer
│       │   ├── features.js      # Heuristic Capability & Feature Extraction
│       │   ├── recorder.js      # Video Capture & Browser Interaction Automation
│       │   ├── render.js        # FFmpeg Video Transcoding & H.264 MP4 Export
│       │   ├── security.js      # SSRF Prevention & Localhost Origin Guard
│       │   └── ollama.js        # Local LLM Integration (Ollama REST API)
│       └── fixture/             # Test Suite Mock Sites
├── packages/
│   └── shared/                  # Shared TypeScript Interfaces, Types, and Schemas
├── scripts/                     # Dev Orchestration & Cross-Process Lifecycle Scripts
└── docs/                        # Windows Setup & Environment Guides
```

### Complete Pipeline Flow

```
   Target URL
       │
       ▼
 [Security Guard] ──────► Validates Protocol & Blocks SSRF / Private IPs
       │
       ▼
 [Playwright Engine] ───► Crawls Pages, Captures Screenshots & DOM Snapshots
       │
       ▼
 [Feature Discovery] ───► Extracts Core Capabilities (Search, Dashboards, CTAs)
       │
       ▼
 [Ollama LLM Planner] ──► Generates 3-7 Scene Showcase Script & Durations
       │                  (Falls back seamlessly to Rule-Based Planner if offline)
       ▼
 [Browser Recorder] ────► Executes Actions in Isolated Browser Viewport (WebM)
       │
       ▼
 [FFmpeg Transcoder] ───► Compiles Master H.264 MP4 with Crisp Aspect Ratio
       │
       ▼
 [Clipwise Desktop] ────► In-App Video Playback, Direct Download & Run Management
```

---

## 🛡️ Security & SSRF Protection

Clipwise is engineered with defense-in-depth security standards:
- **SSRF Prevention**: By default, Clipwise actively resolves domain names and blocks requests targeting `127.0.0.1`, loopback aliases, RFC 1918 private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and IPv6 private addresses.
- **Controlled Local Testing**: For developing against your own local dev servers, set `CLIPWISE_ALLOW_LOCALHOST=1`.
- **Safe Authentication Handling**: Clipwise detects login and authentication forms automatically and marks them with low recording priority — never submitting credentials or executing destructive actions.
- **Origin Confinement**: Exploration remains restricted to the initial domain origin unless explicitly configured.
- **Sandboxed Execution**: LLM responses are treated strictly as unexecutable structured JSON data.

---

## 🚀 Quick Start (Windows)

### Prerequisites

Ensure you have installed:
1. **[Node.js](https://nodejs.org/)** (v20+ LTS recommended)
2. **[Rust & Cargo](https://rustup.rs/)** (`rustup default stable-x86_64-pc-windows-msvc`)
3. **[Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)** (Desktop development with C++)
4. **[FFmpeg](https://ffmpeg.org/)** in your Windows system PATH (`ffmpeg -version`)
5. *(Optional)* **[Ollama](https://ollama.ai/)** for local AI showcase planning

### 1. Clone & Install Dependencies

```powershell
git clone https://github.com/jojin1709/Clipwise.git
cd Clipwise

# Install workspace dependencies
npm install

# Install Playwright browser binaries
npx playwright install chromium
```

### 2. Run in Development Mode

Run the web frontend and browser engine together:
```powershell
npm run dev
# Browser Engine: http://127.0.0.1:37771
# Desktop Web UI: http://localhost:1420
```

To launch the native **Tauri desktop window**:
```powershell
npm run tauri:dev
```

### 3. Build Production Windows Executable

```powershell
npm run build
npm run tauri:build
```
The installer (`.msi` and `.exe`) will be generated in `apps/desktop/src-tauri/target/release/bundle/`.

---

## 🤖 Optional: Local AI with Ollama

Clipwise works 100% out of the box using built-in deterministic planning. To enable AI-written showcase scripts:

1. Download and run [Ollama](https://ollama.ai/).
2. Pull your preferred model:
   ```powershell
   ollama pull qwen2.5:3b
   ```
3. Set the environment variable (optional, defaults to `qwen2.5:3b`):
   ```powershell
   $env:CLIPWISE_OLLAMA_MODEL="qwen2.5:3b"
   ```

---

## 💖 Sponsor & Support

Clipwise is free and open-source software crafted with passion by **JOJIN JOHN**.

If you find Clipwise useful for your workflow, indie projects, or enterprise demos, please consider supporting continued development!

<div align="center">

[![Sponsor JOJIN JOHN](https://img.shields.io/badge/Sponsor-%E2%9D%A4%20JOJIN%20JOHN-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/jojin1709)

**[👉 Click here to sponsor on GitHub Sponsors](https://github.com/sponsors/jojin1709)**

*Your sponsorship helps cover testing hardware, native GPU benchmark rigs, and ongoing open-source maintenance!*

</div>

---

## 👨‍💻 Developed By

**JOJIN JOHN**
- GitHub: [@jojin1709](https://github.com/jojin1709)
- Repository: [github.com/jojin1709/Clipwise](https://github.com/jojin1709/Clipwise)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
