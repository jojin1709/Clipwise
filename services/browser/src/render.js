import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export async function renderMp4(input, output) {
  await fs.mkdir(path.dirname(output), { recursive: true });
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-i", input,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      output
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    ff.stderr.on("data", d => { stderr += d.toString(); });
    ff.on("error", reject);
    ff.on("close", code => code === 0
      ? resolve()
      : reject(new Error(`FFmpeg exited ${code}: ${stderr.slice(-3000)}`)));
  });
  return output;
}
