/// <reference types="vite/client" />
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// If the keys are missing, login is switched off but the rest of the site still works.
export const authEnabled = Boolean(cfg.apiKey);
const app = authEnabled ? initializeApp(cfg) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();