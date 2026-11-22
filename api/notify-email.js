import nodemailer from "nodemailer";
import { auth } from "../lib/firebaseAdmin.js";

const LEVELS = { info: "Info", warning: "Warning", urgent: "Urgent" };
const STAGES = { sediment: "Sediment", uf: "UF", ro: "RO membrane" };
const lastByUser = new Map(); // simple per-user cooldown (resets when the function restarts)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) return res.status(500).json({ error: "Email not configured" });

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: "Please sign in first" });
  }
  if (!decoded.email || decoded.email_verified !== true) {
    return res.status(403).json({ error: "A verified email is required" });
  }

  const now = Date.now();
  if (now - (lastByUser.get(decoded.uid) || 0) < 15000) {
    return res.status(429).json({ error: "Please wait a few seconds" });
  }

  const body = req.body || {};
  const level = Object.hasOwn(LEVELS, body.level) ? body.level : "info";
  const stage = Object.hasOwn(STAGES, body.stage) ? STAGES[body.stage] : null;
  const days = Number(body.days);
  if (!stage || !Number.isFinite(days) || days < 0 || days > 999) {
    return res.status(400).json({ error: "invalid demo alert" });
  }

  const d = Math.round(days);
  const line =
    level === "urgent"
      ? `Replace ${stage} now. About ${d} days of life left.`
      : level === "warning"
      ? `${stage} needs attention in about ${d} days. Plan a replacement.`
      : `${stage} is healthy. About ${d} days left.`;

  lastByUser.set(decoded.uid, now);
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
    await transporter.sendMail({
      from: `FilterPulse Alerts <${gmailUser}>`,
      to: decoded.email, // always the signed-in account, never chosen by the browser
      subject: `[SIMULATED DEMO] ${LEVELS[level]}: ${stage} filter`,
      text: `${line}\n\nThis is a simulated demo alert from FilterPulse (atomQUEST 2026, Team SYNERVA). It is not a real sensor reading.`,
    });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: "Email send failed" });
  }
}