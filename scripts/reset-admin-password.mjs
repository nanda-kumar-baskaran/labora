#!/usr/bin/env node
/**
 * Emergency Admin Password Reset Tool
 * Use this if the admin forgot their password and cannot log in.
 *
 * Usage:
 *   node scripts/reset-admin-password.mjs
 *
 * Or with arguments:
 *   node scripts/reset-admin-password.mjs --email admin@lab.com --password NewPass123
 */
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { createInterface } from "readline";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

// Find the DB file
function findDbPath() {
  const candidates = [
    process.env.LABMS_APP_DATA_DIR ? join(process.env.LABMS_APP_DATA_DIR, "labms.db") : null,
    process.env.LOCAL_DB_PATH ?? null,
    join(process.cwd(), "labms.db"),
    join(homedir(), ".labms", "labms.db"),
    // Windows Electron location
    join(homedir(), "AppData", "Roaming", "labms", "labms.db"),
    // Mac Electron location
    join(homedir(), "Library", "Application Support", "labms", "labms.db"),
  ].filter(Boolean);

  for (const p of candidates) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer); });
  });
}

async function main() {
  console.log("\n🔑 LabMS Emergency Admin Password Reset\n");

  const dbPath = findDbPath();
  if (!dbPath) {
    console.error("❌ Could not find labms.db. Have you run the app at least once?");
    console.error("   Looked in:", [
      join(process.cwd(), "labms.db"),
      join(homedir(), ".labms", "labms.db"),
    ].join(", "));
    process.exit(1);
  }

  console.log("📂 Database:", dbPath);
  const db = createClient({ url: `file:${dbPath}` });

  // List admin users
  const { rows: admins } = await db.execute(
    "SELECT id, full_name, email FROM users WHERE role = 'admin' AND is_active = 1"
  );

  if (!admins.length) {
    console.error("❌ No admin users found. Run the app and complete setup first.");
    process.exit(1);
  }

  console.log("\nAdmin users found:");
  admins.forEach((u, i) => {
    console.log(`  [${i + 1}] ${u.full_name} (${u.email ?? "no email"})`);
  });

  let targetUser;
  if (admins.length === 1) {
    targetUser = admins[0];
    console.log(`\n→ Resetting password for: ${targetUser.full_name}`);
  } else {
    const choice = await prompt("\nEnter number to select user: ");
    const idx = parseInt(choice) - 1;
    if (idx < 0 || idx >= admins.length) { console.error("Invalid selection"); process.exit(1); }
    targetUser = admins[idx];
  }

  // Get new password
  const newPassword = await prompt("Enter new password (min 8 chars): ");
  if (newPassword.length < 8) {
    console.error("❌ Password must be at least 8 characters");
    process.exit(1);
  }

  const confirm = await prompt("Confirm new password: ");
  if (newPassword !== confirm) {
    console.error("❌ Passwords do not match");
    process.exit(1);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db.execute({
    sql: "UPDATE users SET password_hash = ? WHERE id = ?",
    args: [hash, targetUser.id],
  });

  console.log(`\n✅ Password reset for ${targetUser.full_name}`);
  console.log("   You can now log in with the new password.");
  process.exit(0);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
