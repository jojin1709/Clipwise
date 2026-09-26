import dns from "node:dns/promises";
import net from "node:net";

function isPrivateIPv4(ip) {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
}

export async function assertSafeTarget(rawUrl) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are allowed.");
  const host = url.hostname.toLowerCase();
  if (process.env.CLIPWISE_ALLOW_LOCALHOST === "1" || process.env.CLIPWISE_ALLOW_LOCALHOST === "true") {
    return url;
  }
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") {
    throw new Error("Localhost targets are blocked by default.");
  }
  if (net.isIP(host)) {
    if (host === "::1" || isPrivateIPv4(host)) throw new Error("Private/local IP targets are blocked by default.");
    return url;
  }
  const records = await dns.lookup(host, { all: true });
  for (const r of records) {
    if (r.family === 4 && isPrivateIPv4(r.address)) throw new Error("Target resolves to a private IPv4 address.");
    if (r.family === 6 && (r.address === "::1" || r.address.toLowerCase().startsWith("fc"))) {
      throw new Error("Target resolves to a private IPv6 address.");
    }
  }
  return url;
}

export function sameOrigin(base, candidate) {
  try {
    return new URL(base).origin === new URL(candidate).origin;
  } catch {
    return false;
  }
}
