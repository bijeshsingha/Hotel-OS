import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        organization: true,
        roomTypes: {
          include: {
            rooms: {
              include: { roomState: true, blocks: { where: { status: "ACTIVE" } } },
            },
            rateVersions: true,
          },
        },
        taxProfiles: true,
        outlets: {
          include: {
            tables: true,
            categories: {
              include: {
                items: {
                  include: { variants: true, modifierGroups: { include: { modifiers: true } } },
                },
              },
            },
            kitchenStations: true,
          },
        },
        paymentMethods: true,
      },
    });

    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json(property);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
