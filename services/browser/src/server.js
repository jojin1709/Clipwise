import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { exploreWebsite } from "./explorer.js";
import { discoverFeatures } from "./features.js";
import { recordWorkflow } from "./recorder.js";
import { generateShowcasePlan, generateFallbackPlan } from "./ollama.js";
import { renderMp4 } from "./render.js";

const PORT = Number(process.env.CLIPWISE_BROWSER_PORT || 37771);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "runs");

let currentProgress = {
  active: false,
  phase: "idle",
  stepIndex: 0,
  totalSteps: 0,
  percent: 0,
  sectionName: "",
  message: ""
};

async function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(payload));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 2_000_000) req.destroy();
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type,range"
      });
      return res.end();
    }

    if ((req.method === "GET" || req.method === "HEAD") && req.url === "/health") {
      return json(res, 200, { ok: true, service: "clipwise-browser", port: PORT });
    }

    if ((req.method === "GET" || req.method === "HEAD") && req.url === "/api/progress") {
      return json(res, 200, currentProgress);
    }

    // Static file serving for run artifacts (videos, screenshots, JSON)
    if ((req.method === "GET" || req.method === "HEAD") && req.url && req.url.startsWith("/runs/")) {
      const sanitized = decodeURIComponent(req.url.slice("/runs/".length)).replace(/\\/g, "/").replace(/\.\./g, "");
      const filePath = path.resolve(ROOT, sanitized);
      if (!filePath.startsWith(ROOT)) {
        return json(res, 403, { error: "Forbidden" });
      }

      try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) return json(res, 404, { error: "File not found" });

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          ".mp4": "video/mp4",
          ".webm": "video/webm",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".json": "application/json"
        };
        const contentType = mimeTypes[ext] || "application/octet-stream";

        const range = req.headers.range;
        if (range && (ext === ".mp4" || ext === ".webm")) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
          const chunkSize = end - start + 1;
          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${stat.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunkSize,
            "Content-Type": contentType,
            "Access-Control-Allow-Origin": "*"
          });
          if (req.method === "HEAD") return res.end();
          const fileStream = fsSync.createReadStream(filePath, { start, end });
          return fileStream.pipe(res);
        } else {
          res.writeHead(200, {
            "Content-Length": stat.size,
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*"
          });
          if (req.method === "HEAD") return res.end();
          const fileStream = fsSync.createReadStream(filePath);
          return fileStream.pipe(res);
        }
      } catch {
        return json(res, 404, { error: "File not found" });
      }
    }

    if (req.method === "POST" && req.url === "/api/analyze") {
      currentProgress = {
        active: true,
        phase: "exploring",
        stepIndex: 1,
        totalSteps: 3,
        percent: 25,
        sectionName: "Scanning Pages",
        message: "Crawling website structure & capturing screenshots..."
      };
      const input = await body(req);
      const parsed = new URL(input.url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP(S) URLs are allowed.");

      const runId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const runDir = path.join(ROOT, runId);
      const result = await exploreWebsite({
        url: input.url,
        maxPages: Math.min(Number(input.maxPages) || 8, 25),
        maxDepth: Math.min(Number(input.maxDepth) || 2, 4),
        runDir
      });
      const features = discoverFeatures(result);

      // Attach public screenshot URL to pages
      for (const p of result.pages) {
        if (p.screenshot) {
          p.screenshotUrl = `http://127.0.0.1:${PORT}/runs/${runId}/${path.basename(p.screenshot)}`;
        }
      }

      let plan = null;
      if (input.useOllama !== false) {
        try {
          plan = await generateShowcasePlan({
            model: input.model || process.env.CLIPWISE_OLLAMA_MODEL || "qwen2.5:3b",
            features,
            startUrl: result.startUrl,
            style: input.style || "startup",
            aspectRatio: input.aspectRatio || "16:9"
          });
        } catch {
          plan = generateFallbackPlan({
            features,
            startUrl: result.startUrl,
            style: input.style || "startup",
            aspectRatio: input.aspectRatio || "16:9"
          });
        }
      } else {
        plan = generateFallbackPlan({
          features,
          startUrl: result.startUrl,
          style: input.style || "startup",
          aspectRatio: input.aspectRatio || "16:9"
        });
      }

      await fs.writeFile(path.join(runDir, "analysis.json"), JSON.stringify({ result, features, plan }, null, 2));
      currentProgress = {
        active: false,
        phase: "done",
        stepIndex: 3,
        totalSteps: 3,
        percent: 100,
        sectionName: "Analysis Complete",
        message: `${features.length} sections and capabilities discovered`
      };
      return json(res, 200, { runId, result, features, plan });
    }

    if (req.method === "POST" && req.url === "/api/record") {
      const input = await body(req);
      const runId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const runDir = path.join(ROOT, runId);
      const totalSteps = (input.workflow || []).length;

      currentProgress = {
        active: true,
        phase: "recording",
        stepIndex: 0,
        totalSteps,
        percent: 5,
        sectionName: "Initializing Browser",
        message: "Launching automated browser recording session..."
      };

      const video = await recordWorkflow({
        url: input.url,
        workflow: input.workflow || [{ action: "goto", url: input.url }],
        runDir,
        pacing: input.pacing || "standard",
        onProgress: (p) => {
          currentProgress = {
            ...currentProgress,
            ...p,
            active: true,
            phase: "recording"
          };
        }
      });

      let mp4 = null;
      let renderError = null;
      if (video) {
        currentProgress = {
          active: true,
          phase: "rendering",
          stepIndex: totalSteps,
          totalSteps,
          percent: 92,
          sectionName: "Video Encoding",
          message: "Encoding H.264 MP4 showcase video with FFmpeg..."
        };
        try {
          mp4 = await renderMp4(video, path.join(runDir, "showcase.mp4"));
        } catch (error) {
          renderError = error instanceof Error ? error.message : String(error);
        }
      }

      currentProgress = {
        active: false,
        phase: "done",
        stepIndex: totalSteps,
        totalSteps,
        percent: 100,
        sectionName: "Showcase Complete",
        message: "Video rendered successfully!"
      };

      const videoUrl = mp4
        ? `http://127.0.0.1:${PORT}/runs/${runId}/showcase.mp4`
        : video
        ? `http://127.0.0.1:${PORT}/runs/${runId}/${path.basename(video)}`
        : null;
      return json(res, 200, { runId, video, mp4, videoUrl, renderError });
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Clipwise browser service listening on http://127.0.0.1:${PORT}`);
});
