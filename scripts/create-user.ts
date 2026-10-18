// Usage: node scripts/create-user.ts --email you@example.com --name "Your Name" [--role admin|student] [--local]
import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { passwordProblems } from "../worker/lib/crypto.ts";

const DB_NAME = "adminpath-prod-d1";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
const hidden = rl as unknown as { _writeToOutput: (s: string) => void };
hidden._writeToOutput = () => {};
const lines = rl[Symbol.asyncIterator]();

async function askHidden(question: string): Promise<string> {
  process.stdout.write(question);
  const { value } = await lines.next();
  process.stdout.write("\n");
  return typeof value === "string" ? value : "";
}

const sql = (v: string) => `'${v.replace(/'/g, "''")}'`;

const email = (arg("email") || "").toLowerCase().trim();
const name = (arg("name") || "").trim();
const role = arg("role") || "student";
const local = process.argv.includes("--local");

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !["admin", "student"].includes(role)) {
  console.error('Usage: node scripts/create-user.ts --email you@example.com --name "Your Name" [--role admin|student] [--local]');
  process.exit(1);
}

const password = await askHidden("Password: ");
const problems = passwordProblems(password);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
if ((await askHidden("Repeat password: ")) !== password) {
  console.error("Passwords do not match.");
  process.exit(1);
}
rl.close();

const id = `usr_${randomBytes(8).toString("hex")}`;
const salt = randomBytes(16).toString("hex");
const hash = pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");

const statements = [
  `INSERT INTO users (id, email, password_hash, salt, role, status) VALUES (${sql(id)}, ${sql(email)}, ${sql(hash)}, ${sql(salt)}, ${sql(role)}, 'active');`,
];
if (role === "student") {
  statements.push(`INSERT INTO students (user_id, full_name) VALUES (${sql(id)}, ${sql(name)});`);
  statements.push(`INSERT INTO settings (user_id) VALUES (${sql(id)});`);
}

const dir = mkdtempSync(join(tmpdir(), "admitpath-"));
const file = join(dir, "create-user.sql");
try {
  writeFileSync(file, statements.join("\n"), { mode: 0o600 });
  const fileArg = process.platform === "win32" ? `--file="${file}"` : `--file=${file}`;
  execFileSync("npx", ["wrangler", "d1", "execute", DB_NAME, local ? "--local" : "--remote", fileArg], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  console.log(`Created ${role} ${email} (${id}).`);
} catch {
  console.error("User not created, see the Wrangler error above. \"no such table\" means run the migrations first; \"UNIQUE constraint failed\" means that email already has an account.");
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
