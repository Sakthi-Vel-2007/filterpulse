import { auth, db } from "../lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: "Please sign in again" });
  }

  const deviceId = String(req.query?.deviceId || "").toUpperCase();
  if (!/^FP-[0-9A-F]{6}$/.test(deviceId)) return res.status(400).json({ error: "Bad device ID" });

  const dev = (await db.ref(`devices/${deviceId}`).get()).val();
  const allowed = dev && (dev.ownerUid === decoded.uid || (dev.members && dev.members[decoded.uid]));
  if (!allowed) return res.status(403).json({ error: "This purifier is not linked to your account" });

  const live = (await db.ref(`deviceData/${deviceId}/live`).get()).val();
  const out = { serverTime: Date.now(), live: live || null };
  if (req.query?.history === "1") {
    const h = (await db.ref(`deviceData/${deviceId}/history`).get()).val();
    out.history = h ? Object.values(h).sort((a, b) => a.receivedAt - b.receivedAt) : [];
  }
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(out);
}