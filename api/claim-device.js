import { createHash } from "node:crypto";
import { auth, db } from "../lib/firebaseAdmin.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const MAX_ACCOUNTS = 5; // the owner plus up to four more accounts

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

  const uid = decoded.uid;
  const result = await db.ref(`devices/${deviceId}`).transaction((cur) => {
    if (cur === null) return cur;

    if (!cur.ownerUid) {
      // First claim, with the one-time claim code from the purifier
      if ((cur.failedClaims || 0) >= 5) return;
      if (sha(code) !== cur.claimHash) {
        cur.failedClaims = (cur.failedClaims || 0) + 1;
        return cur;
      }
      cur.ownerUid = uid;
      cur.members = { [uid]: true };
      cur.claimedAt = Date.now();
      cur.failedClaims = 0;
      cur.claimHash = null; // works only once
      return cur;
    }

    // Already owned: join with a share code made by the owner
    const members = cur.members || {};
    if (cur.ownerUid === uid || members[uid]) return; // already linked
    if ((cur.failedShares || 0) >= 5) return;
    if (!cur.shareHash || !cur.shareExpiresAt || Date.now() > cur.shareExpiresAt) return;
    if (new Set([cur.ownerUid, ...Object.keys(members)]).size >= MAX_ACCOUNTS) return;
    if (sha(code) !== cur.shareHash) {
      cur.failedShares = (cur.failedShares || 0) + 1;
      return cur;
    }
    cur.members = { ...members, [uid]: true };
    cur.shareHash = null; // a share code works only once
    cur.shareExpiresAt = null;
    return cur;
  });

  const val = result.snapshot.val();
  const isOwner = val && val.ownerUid === uid;
  const isMember = val && val.members && val.members[uid];
  if (isOwner || isMember) {
    await db.ref(`users/${uid}/devices/${deviceId}`).set(isOwner ? "owner" : "member");
    return res.status(200).json({ ok: true, role: isOwner ? "owner" : "member" });
  }
  if (!val) return res.status(404).json({ error: "Device not found or code incorrect" });
  if (!val.ownerUid) {
    if ((val.failedClaims || 0) >= 5) {
      return res.status(423).json({ error: "Too many wrong codes. This purifier is locked." });
    }
    return res.status(404).json({ error: "Device not found or code incorrect" });
  }
  if ((val.failedShares || 0) >= 5) {
    return res.status(423).json({ error: "Too many wrong share codes. Ask the owner for a new one." });
  }
  return res.status(403).json({
    error: "Share code is wrong or expired, or the purifier already has the maximum number of accounts",
  });
}