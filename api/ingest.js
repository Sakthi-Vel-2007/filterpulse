import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "../lib/firebaseAdmin.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const RANGES = {
  tdsIn: [0, 3000], tdsOut: [0, 3000], temp: [-10, 100], turbidity: [0, 4000], ph: [0, 14],
  flow: [0, 60], current: [-10, 10], voltage: [0, 800], litres: [0, 10000000],
};
const MIN_GAP_MS = 2000;
const HISTORY_SLOTS = 720; // one slot per minute: the last 12 hours

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = req.body || {};
  const deviceId = String(body.deviceId || "");
  const key = String(req.headers["x-device-key"] || "");
  if (!/^FP-[0-9A-F]{6}$/.test(deviceId) || !key) return res.status(400).json({ error: "Bad request" });

  const base = db.ref(`devices/${deviceId}`);
  const [hashSnap, lastSnap] = await Promise.all([
    base.child("keyHash").get(),
    db.ref(`deviceData/${deviceId}/live/receivedAt`).get(),
  ]);
  if (!hashSnap.exists() || !safeEqual(sha(key), hashSnap.val())) {
    return res.status(401).json({ error: "Unauthorized device" });
  }

  const now = Date.now();
  if (lastSnap.exists() && now - lastSnap.val() < MIN_GAP_MS) {
    return res.status(429).json({ error: "Too frequent" });
  }

  const reading = { receivedAt: now };
  for (const [k, [lo, hi]] of Object.entries(RANGES)) {
    const v = Number(body[k]);
    if (!Number.isFinite(v) || v < lo || v > hi) return res.status(400).json({ error: `Bad value for ${k}` });
    reading[k] = v;
  }
  reading.pumpOn = body.pumpOn === true;
  reading.stall = body.stall === true;
  reading.pumpType = body.pumpType === "BLDC" ? "BLDC" : "DC";

  const slot = Math.floor(now / 60000) % HISTORY_SLOTS;
  await db.ref().update({
    [`deviceData/${deviceId}/live`]: reading,
    [`deviceData/${deviceId}/history/${slot}`]: reading,
  });
  return res.status(200).json({ ok: true });
}