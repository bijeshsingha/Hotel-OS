import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth/api-access";
import { prisma } from "@/lib/db/prisma";
import { parsePropertyOwners } from "@/lib/domain/property-owners";

/** Read only the payout recipient names; hotel configuration access stays separate. */
export async function GET(request: Request) {
  const access = await authorizeRequest(request);
  if (access instanceof Response) return access;
  const property = await prisma.property.findUnique({ where: { id: access.property.id }, select: { id: true, displayName: true, ownersJson: true } });
  if (!property) return NextResponse.json({ error: "Hotel not found." }, { status: 404 });
  try {
    return NextResponse.json({ propertyId: property.id, propertyName: property.displayName, owners: parsePropertyOwners(property.ownersJson) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The owner list could not be loaded." }, { status: 422 });
  }
}
