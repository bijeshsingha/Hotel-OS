import fs from "fs";
import path from "path";

async function restoreDatabase() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const backupsDir = path.join(process.cwd(), "prisma", "backups");

  if (!fs.existsSync(backupsDir)) {
    console.error("❌ Error: No backups directory found at", backupsDir);
    process.exit(1);
  }

  const specificFile = process.argv[2];

  let targetBackup = "";
  if (specificFile) {
    targetBackup = path.isAbsolute(specificFile)
      ? specificFile
      : path.join(backupsDir, specificFile);
  } else {
    // Find the latest backup
    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.endsWith(".db"))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.error("❌ Error: No .db backup files found in", backupsDir);
      process.exit(1);
    }

    targetBackup = path.join(backupsDir, files[0]);
  }

  if (!fs.existsSync(targetBackup)) {
    console.error("❌ Error: Backup file not found at", targetBackup);
    process.exit(1);
  }

  // Make a safety copy of current db before restoring
  if (fs.existsSync(dbPath)) {
    const safetyPath = path.join(backupsDir, `pre_restore_safety_${Date.now()}.db`);
    fs.copyFileSync(dbPath, safetyPath);
    console.log(`🛡️ Created pre-restore safety copy: ${path.basename(safetyPath)}`);
  }

  fs.copyFileSync(targetBackup, dbPath);

  console.log("==========================================");
  console.log("✅ DATABASE RESTORED SUCCESSFULLY");
  console.log("==========================================");
  console.log(`📁 Source: ${path.basename(targetBackup)}`);
  console.log(`📍 Target: ${dbPath}`);
  console.log("==========================================");
}

restoreDatabase();
