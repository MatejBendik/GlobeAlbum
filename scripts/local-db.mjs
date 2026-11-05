import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const local = resolve(root, ".local");
const data = resolve(local, "postgres");
const socket = resolve(local, "pg-socket");
const pgBin = process.env.POSTGRES_BIN || "/opt/homebrew/opt/postgresql@15/bin";
const command = process.argv[2] || "start";

function run(name, args, options = {}) {
  const result = spawnSync(resolve(pgBin, name), args, {
    stdio: "pipe",
    encoding: "utf8",
    ...options,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${name} failed: ${result.error?.message || result.stderr}`,
    );
  }
  return result.stdout;
}

if (command === "stop") {
  if (existsSync(resolve(data, "postmaster.pid"))) {
    run("pg_ctl", ["-D", data, "stop", "-m", "fast"]);
  }
  console.log("Local GlobeAlbum PostgreSQL stopped.");
  process.exit(0);
}

if (!existsSync(resolve(pgBin, "initdb"))) {
  throw new Error("Set POSTGRES_BIN to an existing PostgreSQL installation.");
}
mkdirSync(local, { recursive: true, mode: 0o700 });
mkdirSync(socket, { recursive: true, mode: 0o700 });
const passwordFile = resolve(local, "db.password");
if (!existsSync(passwordFile)) {
  writeFileSync(passwordFile, randomBytes(24).toString("hex"), { mode: 0o600 });
}
const password = readFileSync(passwordFile, "utf8").trim();
if (!existsSync(resolve(data, "PG_VERSION"))) {
  run("initdb", [
    "-D",
    data,
    "--username",
    "globealbum",
    "--pwfile",
    passwordFile,
    "--auth-host=scram-sha-256",
    "--auth-local=trust",
    "--no-locale",
    "-E",
    "UTF8",
  ]);
}
if (!existsSync(resolve(data, "postmaster.pid"))) {
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    resolve(local, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p 54329 -k ${socket}`,
    "-w",
    "start",
  ]);
}
const connection = { ...process.env, PGPASSWORD: password };
for (const database of ["globealbum_dev", "globealbum_test"]) {
  const present = run(
    "psql",
    [
      "-h",
      "127.0.0.1",
      "-p",
      "54329",
      "-U",
      "globealbum",
      "-d",
      "postgres",
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname='${database}'`,
    ],
    { env: connection },
  ).trim();
  if (!present) {
    run(
      "createdb",
      ["-h", "127.0.0.1", "-p", "54329", "-U", "globealbum", database],
      { env: connection },
    );
  }
}
const base = `postgresql://globealbum:${password}@127.0.0.1:54329/`;
writeFileSync(
  resolve(local, "database.env"),
  `DATABASE_URL=${base}globealbum_dev\nDIRECT_URL=${base}globealbum_dev\nTEST_DATABASE_URL=${base}globealbum_test\n`,
  { mode: 0o600 },
);
const environment = resolve(root, ".env.local");
if (!existsSync(environment)) {
  writeFileSync(
    environment,
    `DATABASE_URL=${base}globealbum_dev\nDIRECT_URL=${base}globealbum_dev\nBETTER_AUTH_URL=http://localhost:3000\nBETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}\n`,
    { mode: 0o600 },
  );
}
console.log(
  "Local PostgreSQL ready on 127.0.0.1:54329. Existing configuration preserved; local credentials are ignored by Git.",
);
