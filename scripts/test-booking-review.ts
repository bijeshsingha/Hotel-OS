import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const testRoot = path.resolve("work/operations-fixtures");
fs.mkdirSync(testRoot, { recursive: true });
const directory = fs.mkdtempSync(path.join(testRoot, "fixture-"));
const databasePath = path.join(directory, "operations-test.db");
const fixtureUrl = `file:${databasePath.replace(/\\/g, "/")}`;
try {
  const env = { ...process.env, DATABASE_URL: fixtureUrl, HOTEL_OS_TEST_DATABASE_URL: fixtureUrl, TZ: "UTC" };
  const schema = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8", env });
  if (schema.status !== 0) throw new Error(`Fixture generation failed: ${schema.stderr}`);
  const database = new DatabaseSync(databasePath);
  database.exec(schema.stdout);
  database.close();
  const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "tests/booking-independent.test.ts"], { stdio: "inherit", env });
  process.exitCode = result.status ?? 1;
} finally {
  if (path.dirname(fs.realpathSync(directory)) !== fs.realpathSync(testRoot) || !path.basename(directory).startsWith("fixture-")) throw new Error("Unexpected fixture cleanup path");
  for (const suffix of ["", "-wal", "-shm"]) if (fs.existsSync(databasePath + suffix)) fs.unlinkSync(databasePath + suffix);
  fs.rmdirSync(directory);
}

