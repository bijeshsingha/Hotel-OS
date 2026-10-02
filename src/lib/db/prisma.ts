import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var sqlitePragmasConfigured: boolean | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// Enforce SQLite write durability & crash tolerance (WAL mode, Normal sync, Busy timeout)
if (!globalThis.sqlitePragmasConfigured) {
  globalThis.sqlitePragmasConfigured = true;
  const isSqlite =
    !process.env.DATABASE_URL ||
    process.env.DATABASE_URL.includes("file:") ||
    process.env.DATABASE_URL.endsWith(".db");

  if (isSqlite) {
    (async () => {
      try {
        await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
        await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
        await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
        await prisma.$queryRawUnsafe("PRAGMA wal_autocheckpoint = 100;");
      } catch {
        // Silently skip if query fails during build or static generation
      }
    })();
  }
}

export default prisma;
