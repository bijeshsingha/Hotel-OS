import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getNextDocumentNumber } from "@/lib/sequence/generator";
import { addCompanyToMaster } from "@/lib/db/company-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      enquiryType = "CORPORATE_RATE_CONTRACT",
      companyName,
      accountType = "CORPORATE",
      contactPerson,
      designation,
      email,
      phone,
      gstin,
      city,
      state,
      estimatedMonthlyRoomNights,
      requiredMealPlans = ["EP", "CP"],
      billingPreference = "BILL_TO_COMPANY",
      message,
    } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json(
        { error: "Company or Travel Agency Name is required." },
        { status: 400 }
      );
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: "At least one contact method (email or phone) is required." },
        { status: 400 }
      );
    }

    // Auto-resolve property if not provided
    let propId = propertyId;
    let orgId = "org_ambarish";
    if (!propId) {
      const prop = await prisma.property.findFirst();
      if (prop) {
        propId = prop.id;
        orgId = prop.organizationId;
      }
    } else {
      const prop = await prisma.property.findUnique({ where: { id: propId } });
      if (prop) orgId = prop.organizationId;
    }

    // Add company to master directory as PENDING lead
    const remarks = [
      `Enquiry Type: ${enquiryType}`,
      contactPerson ? `Contact Person: ${contactPerson} (${designation || "Executive"})` : "",
      estimatedMonthlyRoomNights ? `Est. Monthly Room Nights: ${estimatedMonthlyRoomNights}` : "",
      billingPreference ? `Billing Preference: ${billingPreference}` : "",
      message ? `Message: ${message}` : "",
    ].filter(Boolean).join(" | ");

    const company = await addCompanyToMaster({
      organizationId: orgId,
      propertyId: propId,
      accountType: accountType === "TRAVEL_AGENT" ? "TRAVEL_AGENT" : "CORPORATE",
      accountName: companyName.trim().toUpperCase(),
      shortName: contactPerson ? contactPerson.trim() : null,
      city: city ? city.trim().toUpperCase() : null,
      address: state ? state.trim().toUpperCase() : null,
      phone: phone ? phone.trim() : null,
      mobile: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      foodPlan: Array.isArray(requiredMealPlans) ? requiredMealPlans.join(", ") : "EP",
      remarks,
      status: "ACTIVE",
    });

    const enquiryRef = `ENQ-${accountType === "TRAVEL_AGENT" ? "AGENT" : "CORP"}-${Date.now().toString().slice(-4)}`;

    return NextResponse.json({
      success: true,
      enquiryId: enquiryRef,
      companyId: company.id,
      message: "B2B Corporate / Agent enquiry recorded successfully. Sales desk notified.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
