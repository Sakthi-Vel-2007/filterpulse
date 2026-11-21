import nodemailer from "nodemailer";

const LEVELS = { info: "Info", warning: "Warning", urgent: "Urgent" };
const STAGES = { sediment: "Sediment", uf: "UF", ro: "RO membrane" };
let lastDemo = 0;   // cooldown for the public demo button
let lastDevice = 0; // cooldown for the hardware

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.ALERT_TO; // comma-separated, set only in Vercel
  if (!user || !pass || !to) return res.status(500).json({ error: "Email not configured" });

  const body = req.body || {};
  const level = LEVELS[body.level] ? body.level : "info";
  const isDevice =
    !!process.env.DEVICE_KEY && req.headers["x-device-key"] === process.env.DEVICE_KEY;

  let subject;
  let text;
  if (isDevice && typeof body.text === "string") {
    // Real device: free text, but only with the secret key.
    if (Date.now() - lastDevice < 60000) {
      return res.status(429).json({ error: "Device alert too frequent" });
    }
    subject = `${LEVELS[level]}: FilterPulse alert`;
    text = body.text.slice(0, 500);
    lastDevice = Date.now();
  } else {
    // Website demo: fixed template only, so strangers cannot send arbitrary text.
    if (Date.now() - lastDemo < 15000) {
      return res.status(429).json({ error: "Please wait a few seconds" });
    }
    const stage = STAGES[body.stage];
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
    subject = `[SIMULATED DEMO] ${LEVELS[level]}: ${stage} filter`;
    text = `${line}\n\nThis is a simulated demo alert from FilterPulse (atomQUEST 2026, Team SYNERVA). It is not a real sensor reading.`;
    lastDemo = Date.now();
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `FilterPulse Alerts <${user}>`,
      to,
      subject,
      text,
    });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: "Email send failed" });
  }
}