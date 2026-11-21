import { randomBytes, createHash } from "node:crypto";

const sha = (s) => createHash("sha256").update(s).digest("hex");
const deviceId = "FP-" + randomBytes(3).toString("hex").toUpperCase();
const claimCode = randomBytes(5).toString("hex");
const deviceKey = randomBytes(24).toString("hex");

console.log("");
console.log("Device ID  :", deviceId);
console.log("Claim code :", claimCode, "  (goes on the QR sticker)");
console.log("Device key :", deviceKey, "  (goes in the ESP32 code ONLY)");
console.log("");
console.log("Add these two values in Firebase under /devices/" + deviceId + ":");
console.log("  keyHash   =", sha(deviceKey));
console.log("  claimHash =", sha(claimCode));
console.log("");
console.log("QR link: https://filterpulse.vercel.app/purifier?d=" + deviceId + "&c=" + claimCode);