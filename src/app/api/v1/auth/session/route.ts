import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEmail = searchParams.get("email");
    const requestedPropertyId = searchParams.get("propertyId");

    // Fetch user by requested email, or fallback to first available user
    let user = null;
    if (requestedEmail) {
      user = await prisma.user.findFirst({
        where: { email: requestedEmail },
        include: {
          memberships: {
            include: {
              organization: true,
              propertyGrants: {
                include: {
                  property: true,
                  role: true,
                },
              },
            },
          },
        },
      });
    }

    if (!user) {
      user = await prisma.user.findFirst({
        include: {
          memberships: {
            include: {
              organization: true,
              propertyGrants: {
                include: {
                  property: true,
                  role: true,
                },
              },
            },
          },
        },
      });
    }

    if (!user) {
      return NextResponse.json({ error: "No users found in database" }, { status: 404 });
    }

    const allProperties = await prisma.property.findMany({
      include: { organization: true },
      orderBy: { createdAt: "asc" },
    });

    const allUsers = await prisma.user.findMany({
      include: {
        memberships: {
          include: {
            propertyGrants: {
              include: { role: true },
            },
          },
        },
      },
    });

    // Select active property
    const grants = user.memberships[0]?.propertyGrants || [];
    const availableProperties = grants.length > 0 ? grants.map((g) => g.property) : allProperties;

    const activeProperty =
      availableProperties.find((p) => p.id === requestedPropertyId) ||
      availableProperties[0] ||
      allProperties[0] ||
      null;

    const activeGrant = activeProperty ? grants.find((g) => g.propertyId === activeProperty.id) : null;
    const activeRole = activeGrant?.role?.code || "ORG_OWNER";

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        activeRole,
        roleName: activeGrant?.role?.name || "Organization Owner",
      },
      activeProperty,
      availableProperties,
      allUsers: allUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.memberships[0]?.propertyGrants[0]?.role?.code || "ORG_OWNER",
        roleName: u.memberships[0]?.propertyGrants[0]?.role?.name || "Owner",
      })),
      allProperties,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
