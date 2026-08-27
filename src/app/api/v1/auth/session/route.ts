import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedIdentifier = searchParams.get("email") || searchParams.get("username");
    const requestedPropertyId = searchParams.get("propertyId");

    // Map clean usernames to email addresses
    const usernameAliases: Record<string, string> = {
      "bijesh": "bijesh.singha@hotelos.in",
      "bijesh_singha": "bijesh.singha@hotelos.in",
      "atanu": "atanu.chowdhury@hotelambarish.com",
      "atanu_chowdhury": "atanu.chowdhury@hotelambarish.com",
      "ambarish_frontdesk": "reception.ambarish@hotelos.in",
      "ambarish_reception": "reception.ambarish@hotelos.in",
      "divine_frontdesk": "reception.divine@hotelos.in",
      "divine_reception": "reception.divine@hotelos.in",
      "general_manager": "gm@brahmaputra.com",
      "admin": "bijesh.singha@hotelos.in",
    };

    const targetEmail = requestedIdentifier ? (usernameAliases[requestedIdentifier.toLowerCase()] || requestedIdentifier) : null;

    // Fetch user by requested email / username, or fallback to first available user
    let user = null;
    if (targetEmail) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: targetEmail },
            { email: { startsWith: targetEmail + "@" } },
          ],
        },
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
        where: { email: "bijesh.singha@hotelos.in" },
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
      }) || await prisma.user.findFirst({
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
              include: { property: true, role: true },
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

    const getUsername = (email: string) => {
      if (email.includes("bijesh")) return "bijesh_singha";
      if (email.includes("atanu")) return "atanu_chowdhury";
      if (email.includes("reception.ambarish")) return "ambarish_frontdesk";
      if (email.includes("reception.divine")) return "divine_frontdesk";
      if (email.includes("gm@")) return "general_manager";
      return email.split("@")[0];
    };

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: getUsername(user.email),
        email: user.email,
        activeRole,
        roleName: activeGrant?.role?.name || "Organization Owner",
      },
      activeProperty,
      availableProperties,
      allUsers: allUsers.map((u) => {
        const uGrants = u.memberships[0]?.propertyGrants || [];
        let propertyScope = "All Properties";
        if (uGrants.length === 1) {
          propertyScope = uGrants[0].property.displayName;
        } else if (uGrants.length > 1) {
          propertyScope = `Multi-Property (${uGrants.length})`;
        }

        return {
          id: u.id,
          name: u.name,
          username: getUsername(u.email),
          email: u.email,
          role: u.memberships[0]?.propertyGrants[0]?.role?.code || "ORG_OWNER",
          roleName: u.memberships[0]?.propertyGrants[0]?.role?.name || "Owner",
          propertyScope,
        };
      }),
      allProperties,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
