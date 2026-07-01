/**
 * Labora License Checker
 *
 * Uses Ed25519 asymmetric signing:
 *   - You sign licenses with your PRIVATE key (never ships)
 *   - App verifies with PUBLIC key embedded here
 *   - Even if someone extracts the asar, they can't forge keys
 *
 * License format (base64url of JSON):
 *   { machineId, clientName, issuedAt, expiresAt? }
 *   + Ed25519 signature over that JSON
 *
 * Stored in: userData/labora.license
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// ── Public key — ONLY this ships with the app ─────────────────────────
// Your private key is in scripts/generate-license.mjs — NEVER commit it
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAqPM9rYelval8nXEqpuiRn34Gjk14x7oedz23LEVIUyY=
-----END PUBLIC KEY-----`;

// ── Machine ID — hardware fingerprint ────────────────────────────────
function getMachineId() {
  // Combine CPU info + hostname for a stable-enough machine fingerprint
  // without requiring native modules
  const os = require("os");
  const cpus = os.cpus();
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    cpus.length,
    cpus[0]?.model ?? "",
    os.totalmem(),
  ].join("|");
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

// ── License file path ─────────────────────────────────────────────────
function getLicensePath(app) {
  return path.join(app.getPath("userData"), "labora.license");
}

// ── Verify a license string ───────────────────────────────────────────
function verifyLicense(licenseStr, machineId) {
  try {
    const parts = licenseStr.trim().split(".");
    if (parts.length !== 2) return { valid: false, reason: "Malformed license" };

    const [payloadB64, sigB64] = parts;
    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const sig = Buffer.from(sigB64, "base64url");

    // Verify signature
    const pubKey = crypto.createPublicKey(PUBLIC_KEY_PEM);
    const ok = crypto.verify(null, Buffer.from(payloadJson), pubKey, sig);
    if (!ok) return { valid: false, reason: "Invalid license key" };

    const payload = JSON.parse(payloadJson);

    // Check machine ID
    if (payload.machineId !== machineId) {
      return {
        valid: false,
        reason: "License is for a different machine.\nContact support to transfer your license.",
      };
    }

    // Check expiry (if set)
    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      return {
        valid: false,
        reason: "License expired on " + new Date(payload.expiresAt).toLocaleDateString() + ".\nContact support to renew.",
        expired: true,
        payload,
      };
    }

    return { valid: true, payload };
  } catch (e) {
    return { valid: false, reason: "License parse error: " + e.message };
  }
}

// ── Load and check stored license ────────────────────────────────────
function checkStoredLicense(app) {
  const licensePath = getLicensePath(app);
  const machineId = getMachineId();

  if (!fs.existsSync(licensePath)) {
    return { licensed: false, machineId, reason: null };
  }

  const licenseStr = fs.readFileSync(licensePath, "utf8").trim();
  const result = verifyLicense(licenseStr, machineId);

  if (!result.valid) {
    return { licensed: false, machineId, reason: result.reason };
  }

  return { licensed: true, machineId, payload: result.payload };
}

// ── Activate: save license after verifying ───────────────────────────
function activateLicense(app, licenseStr) {
  const machineId = getMachineId();
  const result = verifyLicense(licenseStr.trim(), machineId);
  if (!result.valid) return result;

  fs.writeFileSync(getLicensePath(app), licenseStr.trim(), "utf8");
  return { valid: true, payload: result.payload };
}

module.exports = { checkStoredLicense, activateLicense, getMachineId };
