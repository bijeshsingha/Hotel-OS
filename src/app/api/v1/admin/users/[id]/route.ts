import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      username,
      handle,
      email,
      phone,
      status,
      roleId,
      propertyIds = [],
      allProperties = false,
      password,
      pin,
    } = body;

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isOwner = user.memberships.some((m) =>
      m.propertyGrants.some((g) => g.role?.code === "ORG_OWNER")
    );

    if (isOwner) {
      if (status && status !== "ACTIVE") {
        return NextResponse.json(
          { error: "The Organization Owner / Super Admin account cannot be suspended or deactivated." },
          { status: 400 }
        );
      }

      if (roleId) {
        const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
        if (!targetRole || targetRole.code !== "ORG_OWNER") {
          return NextResponse.json(
            { error: "The Organization Owner root role cannot be demoted or changed." },
            { status: 400 }
          );
        }
      }
    }

    // Org Owner always retains portfolio-wide access across all properties
    let finalAllProperties = isOwner ? true : allProperties;
    let finalRoleId = roleId;

    const rawHandle = (username || handle || email || "").trim();
    let cleanEmail: string | undefined = undefined;
    if (rawHandle) {
      cleanEmail = rawHandle.includes("@")
        ? rawHandle.toLowerCase()
        : `${rawHandle.toLowerCase().replace(/[^a-z0-9_.-]/g, "")}@hotelos.internal`;

      // Check collision with other users
      const existing = await prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: [
            { email: cleanEmail },
            { email: rawHandle.toLowerCase() },
            { email: { startsWith: rawHandle.toLowerCase() + "@" } },
          ],
        },
      });
      if (existing) {
        return NextResponse.json({ error: `The username or handle "${rawHandle}" is already used by another staff member.` }, { status: 409 });
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update basic info if provided
      await tx.user.update({
        where: { id },
        data: {
          name: name?.trim() || undefined,
          email: cleanEmail || undefined,
          phone: phone !== undefined ? (phone?.trim() || null) : undefined,
          status: isOwner ? "ACTIVE" : (status || undefined),
          passwordHash: password?.trim() ? hashPassword(password.trim()) : undefined,
          pin: pin?.trim() !== undefined ? (pin?.trim() || null) : undefined,
        },
      });

      // 2. If roleId or properties are provided, update grants
      if (finalRoleId || propertyIds.length > 0 || finalAllProperties) {
        const membership = user.memberships[0];
        if (membership) {
          const allProps = await tx.property.findMany();
          const targetPropertyIds = finalAllProperties
            ? allProps.map((p) => p.id)
            : propertyIds.length > 0
            ? propertyIds
            : membership.propertyGrants.map((g) => g.propertyId);

          const targetRoleId = finalRoleId || membership.propertyGrants[0]?.roleId;

          if (targetRoleId && targetPropertyIds.length > 0) {
            // Delete old grants
            await tx.propertyGrant.deleteMany({
              where: { membershipId: membership.id },
            });

            // Create new grants
            for (const pId of targetPropertyIds) {
              await tx.propertyGrant.create({
                data: {
                  membershipId: membership.id,
                  propertyId: pId,
                  roleId: targetRoleId,
                },
              });
            }
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: "User updated successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safety: ensure not deleting the last Organization Owner
    const isOwner = user.memberships.some((m) =>
      m.propertyGrants.some((g) => g.role?.code === "ORG_OWNER")
    );

    if (isOwner) {
      return NextResponse.json(
        { error: "The Organization Owner / Super Admin account cannot be deleted." },
        { status: 400 }
      );
    }

    // Safe deletion: delete grants, memberships, then user
    try {
      await prisma.$transaction(async (tx) => {
        for (const m of user.memberships) {
          await tx.propertyGrant.deleteMany({ where: { membershipId: m.id } });
        }
        await tx.membership.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
      });
    } catch {
      // If historical foreign key constraints block hard deletion, suspend user
      await prisma.user.update({
        where: { id },
        data: { status: "REVOKED" },
      });
    }

    return NextResponse.json({ success: true, message: "Staff member access removed successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}
