import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const [users, roles, properties] = await Promise.all([
      prisma.user.findMany({
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
        orderBy: { createdAt: "desc" },
      }),
      prisma.role.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.property.findMany({
        select: {
          id: true,
          code: true,
          displayName: true,
          legalName: true,
          organizationId: true,
        },
        orderBy: { code: "asc" },
      }),
    ]);

    const formattedUsers = users.map((u) => {
      const membership = u.memberships[0] || null;
      const grants = membership?.propertyGrants || [];
      const primaryRole = grants[0]?.role || null;

      let propertyScope = "None Assigned";
      if (grants.length === 1) {
        propertyScope = grants[0]?.property?.displayName || grants[0]?.property?.code || "1 Property";
      } else if (grants.length > 1) {
        propertyScope = grants.length === properties.length
          ? "All Properties"
          : `Multi-Property (${grants.length} Hotels)`;
      }

      const username = u.email.endsWith("@hotelos.internal")
        ? u.email.replace("@hotelos.internal", "")
        : (u.email.includes("@") ? u.email.split("@")[0] : u.email);

      return {
        id: u.id,
        name: u.name,
        username,
        email: u.email.endsWith("@hotelos.internal") ? "" : u.email,
        rawEmail: u.email,
        phone: u.phone || "",
        status: u.status,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        role: primaryRole?.code || "UNASSIGNED",
        roleName: primaryRole?.name || "Unassigned",
        propertyScope,
        grants: grants.map((g) => ({
          id: g.id,
          propertyId: g.propertyId,
          propertyCode: g.property?.code,
          propertyName: g.property?.displayName,
          roleId: g.roleId,
          roleCode: g.role?.code,
          roleName: g.role?.name,
        })),
      };
    });

    return NextResponse.json({
      users: formattedUsers,
      roles,
      properties,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      username,
      handle,
      email,
      phone,
      roleId,
      propertyIds = [],
      allProperties = false,
      pin,
      password,
    } = body;

    const rawHandle = (username || handle || email || "").trim();
    if (!name?.trim() || !rawHandle) {
      return NextResponse.json({ error: "Staff name and username / work handle are required." }, { status: 400 });
    }

    // Normalize login handle: does not require email format
    const cleanEmail = rawHandle.includes("@")
      ? rawHandle.toLowerCase()
      : `${rawHandle.toLowerCase().replace(/[^a-z0-9_.-]/g, "")}@hotelos.internal`;

    // Check for existing user by login identifier
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { email: rawHandle.toLowerCase() },
          { email: { startsWith: rawHandle.toLowerCase() + "@" } },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ error: `The username or handle "${rawHandle}" is already assigned to another staff member.` }, { status: 409 });
    }

    // Resolve Role
    let role = null;
    if (roleId) {
      role = await prisma.role.findUnique({ where: { id: roleId } });
    }
    if (!role) {
      role = await prisma.role.findFirst({ where: { code: "FD_MGR" } }) || await prisma.role.findFirst();
    }
    if (!role) {
      return NextResponse.json({ error: "No valid role found in the system." }, { status: 400 });
    }

    // Resolve Properties
    const allProps = await prisma.property.findMany();
    if (allProps.length === 0) {
      return NextResponse.json({ error: "No properties found. Please onboard a hotel first." }, { status: 400 });
    }

    const targetPropertyIds = allProperties
      ? allProps.map((p) => p.id)
      : propertyIds.length > 0
      ? propertyIds
      : [allProps[0].id];

    const orgId = allProps[0].organizationId;

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: phone?.trim() || null,
          status: "ACTIVE",
          pin: pin?.trim() || null,
          passwordHash: password?.trim() ? hashPassword(password.trim()) : null,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          status: "ACTIVE",
        },
      });

      for (const propId of targetPropertyIds) {
        await tx.propertyGrant.create({
          data: {
            membershipId: membership.id,
            propertyId: propId,
            roleId: role.id,
          },
        });
      }

      return user;
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      message: `Staff member ${newUser.name} created successfully.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create user." }, { status: 500 });
  }
}
