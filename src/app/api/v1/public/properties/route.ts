import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
export async function GET() {
  const properties = await prisma.property.findMany({ where: { status: "ACTIVE", organization: { status: "ACTIVE" } }, select: { id: true, code: true, displayName: true, legalName: true, address: true, phone: true, email: true, businessDate: true, currency: true }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ properties }, { headers: { "Cache-Control": "no-store" } });
}
