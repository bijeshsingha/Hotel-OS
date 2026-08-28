import fs from "fs";
import path from "path";

async function backupDatabase() {
  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const backupsDir = path.join(process.cwd(), "prisma", "backups");

  if (!fs.existsSync(dbPath)) {
    console.error("❌ Error: Database file not found at", dbPath);
    process.exit(1);
  }

  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  const backupFileName = `backup_${timestamp}.db`;
  const backupFilePath = path.join(backupsDir, backupFileName);

  fs.copyFileSync(dbPath, backupFilePath);

  const stats = fs.statSync(backupFilePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log("==========================================");
  console.log("✅ DATABASE BACKUP CREATED SUCCESSFULLY");
  console.log("==========================================");
  console.log(`📁 File: ${backupFileName}`);
  console.log(`📍 Path: ${backupFilePath}`);
  console.log(`💾 Size: ${sizeMB} MB`);
  console.log("==========================================");
}

backupDatabase();
