import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const usernameAliases: Record<string, string> = {
  "bijesh": "bijesh.singha@hotelos.in",
  "bijesh_singha": "bijesh.singha@hotelos.in",
  "atanu": "atanu.chowdhury@hotelambarish.com",
  "atanu_chowdhury": "atanu.chowdhury@hotelambarish.com",
  "ambarish_frontdesk": "reservation.ambarish@gmail.com",
  "ambarish_reception": "reservation.ambarish@gmail.com",
  "frontdesk": "reservation.ambarish@gmail.com",
  "suraj": "reservation.ambarish@gmail.com",
  "reception.divine": "reception.divine@hotelos.internal",
  "divine_frontdesk": "reception.divine@hotelos.internal",
  "divine_reception": "reception.divine@hotelos.internal",
  "das": "reception.divine@hotelos.internal",
  "general_manager": "atanu.chowdhury@hotelambarish.com",
  "admin": "bijesh.singha@hotelos.in",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = body.identifier || body.username;
    const password = body.password;

    if (!identifier?.trim() || !password?.trim()) {
      return NextResponse.json(
        { error: "Username and password / PIN are required." },
        { status: 400 }
      );
    }

    const cleanId = identifier.trim().toLowerCase();
    const targetEmail = usernameAliases[cleanId] || cleanId;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: targetEmail },
          { email: targetEmail + "@hotelos.internal" },
          { email: { startsWith: targetEmail + "@" } },
          { id: identifier.trim() },
          { name: { equals: identifier.trim() } },
          { name: { contains: identifier.trim() } },
        ],
      },
      include: {
        memberships: {
          include: {
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

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (user.status === "SUSPENDED" || user.status === "REVOKED") {
      return NextResponse.json(
        { error: `Account is ${user.status.toLowerCase()}. Please contact administrator.` },
        { status: 403 }
      );
    }

    // Verify Password or PIN
    const isValid = verifyPassword(password, (user as any).passwordHash, (user as any).pin);
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect password or security PIN." },
        { status: 401 }
      );
    }

    const grants = user.memberships[0]?.propertyGrants || [];
    const activeGrant = grants[0] || null;

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: activeGrant?.role?.code || "STAFF",
        roleName: activeGrant?.role?.name || "Staff",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Authentication verification error" },
      { status: 500 }
    );
  }
}
