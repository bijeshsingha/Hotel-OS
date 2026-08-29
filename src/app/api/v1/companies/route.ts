import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCompanyMasterList } from "@/lib/db/company-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const search = searchParams.get("query") || "";
    const type = searchParams.get("type") || "ALL";

    let organizationId = "org_grand_guwahati";
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (property) organizationId = property.organizationId;
    }

    const companies = await getCompanyMasterList(organizationId, search, type);
    return NextResponse.json(companies);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      accountType = "COMPANY",
      accountName,
      shortName,
      city,
      address,
      phone,
      mobile,
      email,
      faxNo,
      gstin,
      panNo,
      foodPlan = "EP",
      fbDiscountPercent = 0,
      creditLimit = 0,
      openingBalance = 0,
      commissionPercent = 0,
      remarks,
    } = body;

    if (!accountName || !accountName.trim()) {
      return NextResponse.json({ error: "Company / Travel Agent Name is required." }, { status: 400 });
    }

    let organizationId = "org_grand_guwahati";
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
      });
      if (property) organizationId = property.organizationId;
    }

    const created = await (prisma as any).companyMaster.create({
      data: {
        organizationId,
        propertyId: propertyId || null,
        accountType,
        accountName: accountName.trim(),
        shortName: shortName?.trim() || null,
        city: city?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        mobile: mobile?.trim() || null,
        email: email?.trim() || null,
        faxNo: faxNo?.trim() || null,
        gstin: gstin?.trim() ? gstin.trim().toUpperCase() : null,
        panNo: panNo?.trim() ? panNo.trim().toUpperCase() : null,
        foodPlan,
        fbDiscountPercent: Number(fbDiscountPercent) || 0,
        creditLimit: Number(creditLimit) || 0,
        openingBalance: Number(openingBalance) || 0,
        commissionPercent: Number(commissionPercent) || 0,
        remarks: remarks?.trim() || null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, company: created });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A company or agent with this name already exists in the master list." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "Company ID is required" }, { status: 400 });
    }

    const updated = await (prisma as any).companyMaster.update({
      where: { id },
      data: {
        ...(data.accountName ? { accountName: data.accountName.trim() } : {}),
        ...(data.accountType ? { accountType: data.accountType } : {}),
        ...(data.shortName !== undefined ? { shortName: data.shortName?.trim() || null } : {}),
        ...(data.city !== undefined ? { city: data.city?.trim() || null } : {}),
        ...(data.address !== undefined ? { address: data.address?.trim() || null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
        ...(data.mobile !== undefined ? { mobile: data.mobile?.trim() || null } : {}),
        ...(data.email !== undefined ? { email: data.email?.trim() || null } : {}),
        ...(data.gstin !== undefined ? { gstin: data.gstin?.trim()?.toUpperCase() || null } : {}),
        ...(data.panNo !== undefined ? { panNo: data.panNo?.trim()?.toUpperCase() || null } : {}),
        ...(data.creditLimit !== undefined ? { creditLimit: Number(data.creditLimit) || 0 } : {}),
        ...(data.commissionPercent !== undefined ? { commissionPercent: Number(data.commissionPercent) || 0 } : {}),
        ...(data.foodPlan !== undefined ? { foodPlan: data.foodPlan } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.remarks !== undefined ? { remarks: data.remarks?.trim() || null } : {}),
      },
    });

    return NextResponse.json({ success: true, company: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
