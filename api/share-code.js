import { randomBytes, createHash } from "node:crypto";
import { auth, db } from "../lib/firebaseAdmin.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const TTL_MS = 24 * 60 * 60 * 1000; // a share code is valid for 24 hours

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: "Please sign in again" });
  }

  const deviceId = String(req.body?.deviceId || "").toUpperCase();
  if (!/^FP-[0-9A-F]{6}$/.test(deviceId)) {
    return res.status(400).json({ error: "Bad device ID" });
  }

  const ref = db.ref(`devices/${deviceId}`);
  const dev = (await ref.get()).val();
  if (!dev || dev.ownerUid !== decoded.uid) {
    return res.status(403).json({ error: "Only the owner can share this purifier" });
  }

  const code = randomBytes(5).toString("hex"); // 10 characters, shown only once
  await ref.update({
    shareHash: sha(code),
    shareExpiresAt: Date.now() + TTL_MS,
    failedShares: 0,
  });
  return res.status(200).json({ code, expiresInHours: 24 });
}