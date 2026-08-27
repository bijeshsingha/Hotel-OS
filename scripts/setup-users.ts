import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Setting up Bijesh Singha and Atanu Chowdhury users...");

  // 1. Get or Create Organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        id: "org_ambarish",
        legalName: "Ambarish Hospitality Group",
        displayName: "Ambarish & Divine View Hotels",
        pan: "AACCB2447F",
        status: "ACTIVE",
      },
    });
  }

  // 2. Get Properties
  const properties = await prisma.property.findMany();
  const ambarishProp = properties.find(
    (p) =>
      p.code === "GUW-01" ||
      p.displayName.toLowerCase().includes("ambarish") ||
      p.legalName.toLowerCase().includes("ambarish")
  ) || properties[0];

  if (!ambarishProp) {
    throw new Error("No property found for Hotel Ambarish.");
  }

  console.log(`Found Hotel Ambarish: ${ambarishProp.displayName} (${ambarishProp.id})`);

  // 3. Ensure Roles exist
  const ownerRole = await prisma.role.upsert({
    where: { code: "ORG_OWNER" },
    update: { name: "Organization Owner & Super Admin" },
    create: {
      code: "ORG_OWNER",
      name: "Organization Owner & Super Admin",
      scopeType: "ORG",
      builtIn: true,
    },
  });

  const gmRole = await prisma.role.upsert({
    where: { code: "ADMIN_GM" },
    update: { name: "General Manager" },
    create: {
      code: "ADMIN_GM",
      name: "General Manager",
      scopeType: "PROPERTY",
      builtIn: true,
    },
  });

  const fdRole = await prisma.role.upsert({
    where: { code: "FD_MGR" },
    update: { name: "Front Desk Manager" },
    create: {
      code: "FD_MGR",
      name: "Front Desk Manager",
      scopeType: "PROPERTY",
      builtIn: true,
    },
  });

  // 4. Create User: Bijesh Singha (Multi-Property Admin across all hotels)
  const bijesh = await prisma.user.upsert({
    where: { email: "bijesh.singha@hotelos.in" },
    update: {
      name: "Bijesh Singha",
      phone: "+91 98640 99999",
      status: "ACTIVE",
    },
    create: {
      id: "usr_bijesh",
      name: "Bijesh Singha",
      email: "bijesh.singha@hotelos.in",
      phone: "+91 98640 99999",
      status: "ACTIVE",
    },
  });

  const bijeshMembership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: bijesh.id,
        organizationId: ambarishProp.organizationId,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      userId: bijesh.id,
      organizationId: ambarishProp.organizationId,
      status: "ACTIVE",
    },
  });

  // Grant Bijesh Singha ORG_OWNER access to all properties in DB
  for (const prop of properties) {
    await prisma.propertyGrant.upsert({
      where: {
        membershipId_propertyId_roleId: {
          membershipId: bijeshMembership.id,
          propertyId: prop.id,
          roleId: ownerRole.id,
        },
      },
      update: {},
      create: {
        membershipId: bijeshMembership.id,
        propertyId: prop.id,
        roleId: ownerRole.id,
      },
    });
    console.log(`Granted Bijesh Singha access to ${prop.displayName} (${prop.code})`);
  }

  // 5. Create User: Atanu Chowdhury (Hotel Ambarish only)
  const atanu = await prisma.user.upsert({
    where: { email: "atanu.chowdhury@hotelambarish.com" },
    update: {
      name: "Atanu Chowdhury",
      phone: "+91 98643 41211",
      status: "ACTIVE",
    },
    create: {
      id: "usr_atanu",
      name: "Atanu Chowdhury",
      email: "atanu.chowdhury@hotelambarish.com",
      phone: "+91 98643 41211",
      status: "ACTIVE",
    },
  });

  const atanuMembership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: atanu.id,
        organizationId: ambarishProp.organizationId,
      },
    },
    update: { status: "ACTIVE" },
    create: {
      userId: atanu.id,
      organizationId: ambarishProp.organizationId,
      status: "ACTIVE",
    },
  });

  // Grant Atanu Chowdhury access ONLY to Hotel Ambarish Grand Residency
  await prisma.propertyGrant.upsert({
    where: {
      membershipId_propertyId_roleId: {
        membershipId: atanuMembership.id,
        propertyId: ambarishProp.id,
        roleId: gmRole.id,
      },
    },
    update: {},
    create: {
      membershipId: atanuMembership.id,
      propertyId: ambarishProp.id,
      roleId: gmRole.id,
    },
  });
  console.log(`Granted Atanu Chowdhury access to ${ambarishProp.displayName} (${ambarishProp.code})`);

  // Clean up any other dummy test grants if needed
  console.log("Setup completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error setting up users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
