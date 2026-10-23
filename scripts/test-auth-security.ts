import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

// Each suite receives a fresh database and cannot inherit the operational URL.
for (const testFile of ["tests/auth-security.test.ts", "tests/auth-role-boundaries.test.ts"]) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "hotel-os-auth-tests-"));
  const databasePath = path.join(temporaryDirectory, "security-test.db");
  const fixtureUrl = `file:${databasePath.replace(/\\/g, "/")}`;
  try {
    const schema = spawnSync(process.execPath, [path.join(process.cwd(), "node_modules/prisma/build/index.js"), "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"], { encoding: "utf8", env: { ...process.env, DATABASE_URL: fixtureUrl } });
    if (schema.status !== 0) throw new Error(`Fixture schema generation failed: ${schema.stderr}`);
    const database = new DatabaseSync(databasePath);
    database.exec(schema.stdout);
    database.close();
    const result = spawnSync(process.execPath, ["--import", "tsx", "--test", testFile], { stdio: "inherit", env: { ...process.env, DATABASE_URL: fixtureUrl, HOTEL_OS_TEST_DATABASE_URL: fixtureUrl } });
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      break;
    }
  } finally {
    // Remove only known fixture files in the exact directory just created.
    if (path.dirname(fs.realpathSync(temporaryDirectory)) !== fs.realpathSync(os.tmpdir()) || !path.basename(temporaryDirectory).startsWith("hotel-os-auth-tests-")) throw new Error("Unexpected fixture cleanup path");
    for (const suffix of ["", "-wal", "-shm"]) if (fs.existsSync(`${databasePath}${suffix}`)) fs.unlinkSync(`${databasePath}${suffix}`);
    fs.rmdirSync(temporaryDirectory);
  }
}
