import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function dump() {
  const models = [
    "organization",
    "property",
    "roomType",
    "room",
    "guest",
    "reservation",
    "reservationRoom",
    "stay",
    "roomAssignment",
    "folio",
    "folioCharge",
    "folioPayment",
    "invoice",
    "companyMaster",
    "expense",
    "auditLog",
  ];

  const backupData: any = {
    exportedAt: new Date().toISOString(),
    tables: {},
  };

  for (const model of models) {
    if ((prisma as any)[model]) {
      try {
        backupData.tables[model] = await (prisma as any)[model].findMany();
      } catch (e: any) {
        backupData.tables[model] = { error: e.message };
      }
    }
  }

  const jsonPath = path.join(process.cwd(), "prisma", "backups", "dump_2026-08-29_18-53-26.json");
  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2), "utf8");
  console.log("Updated JSON Table dump saved to:", jsonPath);
}

dump()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
