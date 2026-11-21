import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

if (!getApps().length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!raw || !databaseURL) throw new Error("Firebase is not configured");
  initializeApp({ credential: cert(JSON.parse(raw)), databaseURL });
}

export const auth = getAuth();
export const db = getDatabase();