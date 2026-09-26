# Windows Setup

Open PowerShell in the repository.

## 1. Install dependencies

```powershell
npm install
npx playwright install chromium
```

## 2. Verify Rust

```powershell
rustc --version
cargo --version
```

## 3. Verify FFmpeg

```powershell
ffmpeg -version
```

## 4. Start browser service

Terminal 1:

```powershell
npm run dev:browser
```

## 5. Start the web UI

Terminal 2:

```powershell
npm run dev:web
```

Open http://localhost:1420.

## 6. Start Tauri

Or:

```powershell
npm run tauri:dev
```

Tauri runs the frontend command automatically.

## 7. Optional Ollama

Install Ollama and pull a small model appropriate for your hardware:

```powershell
ollama pull qwen2.5:3b
```

Then:

```powershell
$env:CLIPWISE_OLLAMA_MODEL="qwen2.5:3b"
```

The application still works without Ollama; the planner simply falls back to deterministic feature discovery.
