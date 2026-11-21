import { createHash } from "node:crypto";
import { auth, db } from "../lib/firebaseAdmin.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");

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
  if (!decoded.email || decoded.email_verified !== true) {
    return res.status(403).json({ error: "A verified email is required" });
  }

  const deviceId = String(req.body?.deviceId || "").toUpperCase();
  const code = String(req.body?.code || "").toLowerCase();
  if (!/^FP-[0-9A-F]{6}$/.test(deviceId) || !/^[0-9a-f]{10}$/.test(code)) {
    return res.status(400).json({ error: "Check the device ID and code" });
  }

  const result = await db.ref(`devices/${deviceId}`).transaction((cur) => {
    if (cur === null) return cur;
    if (cur.ownerUid) return; // already claimed: abort
    if ((cur.failedClaims || 0) >= 5) return; // locked after too many wrong codes
    if (sha(code) !== cur.claimHash) {
      cur.failedClaims = (cur.failedClaims || 0) + 1;
      return cur;
    }
    cur.ownerUid = decoded.uid;
    cur.claimedAt = Date.now();
    cur.failedClaims = 0;
    cur.claimHash = null; // the code works only once
    return cur;
  });

  const val = result.snapshot.val();
  if (val && val.ownerUid === decoded.uid) {
    await db.ref(`users/${decoded.uid}/devices/${deviceId}`).set(true);
    return res.status(200).json({ ok: true });
  }
  if (val && val.ownerUid) {
    return res.status(409).json({ error: "This purifier is already linked to an account" });
  }
  if (val && (val.failedClaims || 0) >= 5) {
    return res.status(423).json({ error: "Too many wrong codes. This purifier is locked." });
  }
  return res.status(404).json({ error: "Device not found or code incorrect" });
}