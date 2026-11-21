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

  const snap = await db.ref(`users/${decoded.uid}/devices`).get();
  const devices = snap.exists() ? Object.keys(snap.val()) : [];
  return res.status(200).json({ devices });
}