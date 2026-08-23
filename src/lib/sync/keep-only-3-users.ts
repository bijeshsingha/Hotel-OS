import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  console.log("👥 Cleaning up users and keeping exactly the 3 required accounts...");

  const keepEmails = [
    "reception.ambarish@hotelos.in",
    "reception.divine@hotelos.in",
    "gm@brahmaputra.com",
  ];

  const usersToDelete = await prisma.user.findMany({
    where: {
      email: { notIn: keepEmails },
    },
  });

  console.log(`Found ${usersToDelete.length} extra users to remove.`);

  if (usersToDelete.length > 0) {
    const ids = usersToDelete.map((u) => u.id);
    const idListStr = ids.map((id) => `'${id}'`).join(", ");

    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = OFF;`);
    await prisma.$executeRawUnsafe(
      `DELETE FROM PropertyGrant WHERE membershipId IN (SELECT id FROM Membership WHERE userId IN (${idListStr}));`
    );
    await prisma.$executeRawUnsafe(`DELETE FROM Membership WHERE userId IN (${idListStr});`);
    await prisma.$executeRawUnsafe(`DELETE FROM UserSession WHERE userId IN (${idListStr});`);
    await prisma.$executeRawUnsafe(`DELETE FROM PermissionOverride WHERE userId IN (${idListStr});`);
    await prisma.$executeRawUnsafe(`DELETE FROM User WHERE id IN (${idListStr});`);
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys = ON;`);
  }

  const remainingUsers = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          propertyGrants: {
            include: { property: true, role: true },
          },
        },
      },
    },
    orderBy: { email: "asc" },
  });

  console.log(`\n🎉 Success! Total remaining users in database: ${remainingUsers.length}`);
  remainingUsers.forEach((u, i) => {
    const grants = u.memberships[0]?.propertyGrants || [];
    console.log(`\n${i + 1}. User: ${u.name}`);
    console.log(`   Email:    ${u.email}`);
    console.log(`   Granted:  ${grants.map((g) => `${g.property.displayName} (${g.property.code}) [${g.role.code}]`).join(", ")}`);
  });
}

run()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
