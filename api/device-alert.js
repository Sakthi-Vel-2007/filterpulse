import { createHash, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { auth, db } from "../lib/firebaseAdmin.js";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const RANK = { ok: 0, warning: 1, urgent: 2 };
const LABEL = { warning: "Warning", urgent: "Urgent" };
const GAP_SAME = 60 * 60 * 1000; // repeat of the same level: at most hourly
const GAP_ESCALATE = 60 * 1000;  // a worse level: after at least a minute
const MAX_RECIPIENTS = 6;

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const body = req.body || {};
  const deviceId = String(body.deviceId || "");
  const key = String(req.headers["x-device-key"] || "");
  const level = body.level;
  if (!/^FP-[0-9A-F]{6}$/.test(deviceId) || !key || !Object.hasOwn(RANK, level)) {
    return res.status(400).json({ error: "Bad request" });
  }

  const dev = (await db.ref(`devices/${deviceId}`).get()).val();
  if (!dev || !safeEqual(sha(key), dev.keyHash || "")) {
    return res.status(401).json({ error: "Unauthorized device" });
  }
  if (!dev.ownerUid) {
    return res.status(409).json({ error: "Purifier is not linked to an account yet" });
  }

  const stateRef = db.ref(`devices/${deviceId}/alertState`);
  const st = dev.alertState || {};
  const lastRank = st.lastRank ?? 0;
  const lastSentAt = st.lastSentAt ?? 0;
  const now = Date.now();

  if (level === "ok") {
    await stateRef.update({ lastRank: 0 }); // recovered: allow a fresh alert later
    return res.status(200).json({ ok: true, sent: false });
  }

  const rank = RANK[level];
  const gap = now - lastSentAt;
  const allowed = rank > lastRank ? gap >= GAP_ESCALATE : gap >= GAP_SAME;
  if (!allowed) return res.status(429).json({ error: "Alert suppressed to avoid repeats" });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) return res.status(500).json({ error: "Email not configured" });

  // The owner plus every linked account, looked up on the server
  const uids = [...new Set([dev.ownerUid, ...Object.keys(dev.members || {})])].slice(
    0,
    MAX_RECIPIENTS
  );
  const emails = [];
  for (const uid of uids) {
    try {
      const u = await auth.getUser(uid);
      if (u.email) emails.push(u.email);
    } catch {
      // skip an account that no longer exists
    }
  }
  if (emails.length === 0) return res.status(500).json({ error: "No recipient emails found" });

  const text =
    typeof body.text === "string" && body.text.trim()
      ? body.text.slice(0, 400)
      : "Your purifier needs attention.";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  let sent = 0;
  for (const to of emails) {
    try {
      // one separate email per person, so nobody sees the others' addresses
      await transporter.sendMail({
        from: `FilterPulse Alerts <${gmailUser}>`,
        to,
        subject: `${LABEL[level]}: FilterPulse alert for purifier ${deviceId}`,
        text: `${text}\n\nPurifier: ${deviceId}\n\nSent by FilterPulse (atomQUEST 2026, Team SYNERVA).`,
      });
      sent += 1;
    } catch {
      // try the next recipient
    }
  }
  if (sent === 0) return res.status(502).json({ error: "Email send failed" });

  await stateRef.set({ lastRank: rank, lastSentAt: now });
  return res.status(200).json({ ok: true, sent: true, recipients: sent });
}