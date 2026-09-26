import { spawn } from "node:child_process";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isWin = process.platform === "win32";
const npm = isWin ? "npm.cmd" : "npm";
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const browser = spawn(npm, ["run", "dev:browser"], { cwd: repo, stdio: "inherit", shell: isWin });
const vite = spawn(npm, ["run", "dev:web"], { cwd: repo, stdio: "inherit", shell: isWin });

const shutdown = () => {
  for (const child of [browser, vite]) {
    try {
      if (!child.killed) child.kill();
    } catch {
      // ignore
    }
  }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
browser.on("error", e => console.error("Browser service failed:", e));
vite.on("error", e => console.error("Vite failed:", e));

