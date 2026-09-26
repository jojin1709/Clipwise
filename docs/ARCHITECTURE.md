# Architecture

## Runtime

React UI runs inside Tauri's WebView.

The browser service is intentionally a separate Node process because Playwright needs its own Node runtime and Chromium installation.

```text
Tauri
  |
  +-- React UI
  |
  +-- Rust commands / native integration
  |
  +-- local browser service :37771
          |
          +-- Playwright / Chromium
          +-- heuristic feature discovery
          +-- optional Ollama
          +-- recording
```

## Why separate services?

- isolates browser automation from the desktop UI
- keeps Playwright upgrades independent
- makes the browser engine testable
- allows future packaging of Node + Chromium
- avoids arbitrary browser automation code inside the renderer

## AI

Ollama is optional. The deterministic feature-discovery path means ShowcaseAI can analyze simple public websites without an LLM.

LLM output is always treated as untrusted structured data.

## Video

Playwright records browser sessions. FFmpeg is the final rendering layer and can later add narration, captions, transitions, branding and multiple aspect ratios.
