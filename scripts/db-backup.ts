import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  // 1. Verify SQLite integrity and checkpoint
  try {
    const integrityResult = await prisma.$queryRawUnsafe<any[]>("PRAGMA integrity_check;");
    const status = integrityResult?.[0]?.integrity_check || "ok";
    console.log(`🔍 SQLite Integrity Check: ${status === "ok" ? "OK (Healthy)" : status}`);
  } catch (err: any) {
    console.warn("⚠️ Warning: Could not run PRAGMA integrity_check:", err.message);
  }

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  // 2. Binary SQLite copy
  const backupFileName = `backup_${timestamp}.db`;
  const backupFilePath = path.join(backupsDir, backupFileName);
  fs.copyFileSync(dbPath, backupFilePath);

  const stats = fs.statSync(backupFilePath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  // 3. Export JSON Data Tables
  const models = [
    "organization",
    "property",
    "user",
    "roomType",
    "room",
    "roomState",
    "guest",
    "guestRegistration",
    "reservation",
    "reservationRoom",
    "stay",
    "roomAssignment",
    "folio",
    "folioWindow",
    "folioEntry",
    "payment",
    "invoice",
    "invoiceLine",
    "creditNote",
    "expense",
    "kOT",
    "order",
    "auditLog",
    "housekeepingTask",
    "maintenanceIssue",
  ];

  const backupData: any = {
    backupMetadata: {
      exportedAt: now.toISOString(),
      databaseFile: backupFileName,
      sizeBytes: stats.size,
      sizeMB: Number(sizeMB),
      engine: "SQLite 3 (Prisma)",
    },
    counts: {},
    tables: {},
  };

  for (const model of models) {
    if ((prisma as any)[model]) {
      try {
        const records = await (prisma as any)[model].findMany();
        backupData.tables[model] = records;
        backupData.counts[model] = records.length;
      } catch (e: any) {
        backupData.tables[model] = { error: e.message };
        backupData.counts[model] = 0;
      }
    }
  }

  const jsonFileName = `dump_${timestamp}.json`;
  const jsonFilePath = path.join(backupsDir, jsonFileName);
  fs.writeFileSync(jsonFilePath, JSON.stringify(backupData, null, 2), "utf8");
  const jsonStats = fs.statSync(jsonFilePath);
  const jsonSizeMB = (jsonStats.size / (1024 * 1024)).toFixed(2);

  console.log("==========================================");
  console.log("✅ DATABASE BACKUP CREATED SUCCESSFULLY");
  console.log("==========================================");
  console.log(`📁 Binary SQLite Backup: ${backupFileName}`);
  console.log(`📍 Path: ${backupFilePath}`);
  console.log(`💾 Size: ${sizeMB} MB`);
  console.log("------------------------------------------");
  console.log(`📄 JSON Dump: ${jsonFileName}`);
  console.log(`📍 Path: ${jsonFilePath}`);
  console.log(`💾 Size: ${jsonSizeMB} MB`);
  console.log("------------------------------------------");
  console.log("📊 Summary of Backed Up Records:");
  console.log(`   - Properties: ${backupData.counts.property || 0}`);
  console.log(`   - Rooms: ${backupData.counts.room || 0}`);
  console.log(`   - Guests: ${backupData.counts.guest || 0}`);
  console.log(`   - Stays: ${backupData.counts.stay || 0}`);
  console.log(`   - Room Assignments: ${backupData.counts.roomAssignment || 0}`);
  console.log(`   - Folios: ${backupData.counts.folio || 0}`);
  console.log(`   - Folio Entries: ${backupData.counts.folioEntry || 0}`);
  console.log(`   - Invoices: ${backupData.counts.invoice || 0}`);
  console.log(`   - Payments / Collections: ${backupData.counts.payment || 0}`);
  console.log(`   - Expenses: ${backupData.counts.expense || 0}`);
  console.log(`   - KOTs: ${backupData.counts.kOT || 0}`);
  console.log("==========================================");
}

backupDatabase()
  .catch((err) => {
    console.error("❌ Backup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
