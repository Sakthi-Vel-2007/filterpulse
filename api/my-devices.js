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

  const uid = decoded.uid;
  const snap = await db.ref(`users/${uid}/devices`).get();
  const ids = snap.exists() ? Object.keys(snap.val()) : [];

  const found = await Promise.all(
    ids.map(async (id) => {
      const dev = (await db.ref(`devices/${id}`).get()).val();
      if (!dev) return null;
      const isOwner = dev.ownerUid === uid;
      const isMember = !!(dev.members && dev.members[uid]);
      if (!isOwner && !isMember) return null; // access was removed
      return { id, role: isOwner ? "owner" : "member" };
    })
  );
  return res.status(200).json({ devices: found.filter(Boolean) });
}