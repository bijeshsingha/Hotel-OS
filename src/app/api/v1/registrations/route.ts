import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { normalizeGuestName } from "@/lib/domain/name-utils";
import { archiveGrcSnapshot } from "@/lib/domain/grc-archive-service";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/v1/registrations?propertyId=...&status=...
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get("propertyId");
    const status = searchParams.get("status"); // PENDING_REVIEW, CHECKED_IN, REJECTED

    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400, headers: corsHeaders });
    }

    const registrations = await prisma.guestRegistration.findMany({
      where: {
        propertyId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(registrations, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// POST /api/v1/registrations - Guest Self Check-In Submission
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      propertyId,
      fullName,
      age,
      gender,
      nationality = "Indian",
      fatherSpouseName,
      arrivalDateTime,
      expectedDepartureDate,
      preAssignedRoom,
      streetAddress,
      city,
      state,
      pinZipCode,
      country = "India",
      arrivedFrom,
      goingTo,
      purposeOfVisit = "Tourism / Holiday",
      referralChannel,
      mobilePhone,
      alternatePhone,
      email,
      driverName,
      vehicleNumber,
      coGuests,
      idDocumentType,
      idDocumentNumber,
      idPhotoUrl,
      foreignPassportDetails,
      signatureDataUrl,
      termsAccepted = true,
      notes,
    } = body;

    if (!fullName || !mobilePhone) {
      return NextResponse.json({ error: "Full Name and Mobile Phone are mandatory" }, { status: 400 });
    }

    // Resolve property
    let prop = null;
    if (propertyId) {
      prop = await prisma.property.findUnique({ where: { id: propertyId } });
    }
    if (!prop) {
      prop = await prisma.property.findFirst({ orderBy: { createdAt: "asc" } });
    }
    if (!prop) {
      return NextResponse.json({ error: "No active property found" }, { status: 404 });
    }

    // Validate room occupancy if preAssignedRoom is requested
    if (preAssignedRoom) {
      const roomNum = String(preAssignedRoom).trim();
      const existingOccupancy = await prisma.roomAssignment.findFirst({
        where: {
          room: { propertyId: prop.id, number: roomNum },
          endsAt: null,
          stay: { status: "IN_HOUSE" },
        },
        include: { room: true },
      });
      if (existingOccupancy) {
        return NextResponse.json(
          {
            error: `Room ${roomNum} is currently occupied by an active guest. Please select an available room or leave blank for reception assignment.`,
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Generate unique Registration / GRC Number scoped to property
    const propCode = prop.code === "GUW-01" ? "AMB" : prop.code === "HDW" || prop.code === "HDV-01" ? "HDV" : prop.code;
    const regCount = await prisma.guestRegistration.count({ where: { propertyId: prop.id } });
    const regNo = `GRC-${propCode}-2627-${String(regCount + 101).padStart(4, "0")}`;

    const { pureName: canonicalFullName } = normalizeGuestName(fullName);

    const registration = await prisma.guestRegistration.create({
      data: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        registrationNo: regNo,
        status: "PENDING_REVIEW",
        fullName: canonicalFullName.toUpperCase(),
        age: age ? Number(age) : null,
        gender: gender || "Male",
        nationality: nationality || "Indian",
        fatherSpouseName: fatherSpouseName || null,
        arrivalDateTime: arrivalDateTime || new Date().toISOString().replace("T", " ").slice(0, 16),
        expectedDepartureDate: expectedDepartureDate || null,
        preAssignedRoom: preAssignedRoom || null,
        streetAddress: streetAddress || null,
        city: city || null,
        state: state || null,
        pinZipCode: pinZipCode || null,
        country: country || "India",
        arrivedFrom: arrivedFrom || null,
        goingTo: goingTo || null,
        purposeOfVisit: purposeOfVisit || "Tourism / Holiday",
        referralChannel: referralChannel || null,
        mobilePhone: mobilePhone.trim(),
        alternatePhone: alternatePhone || null,
        email: email ? email.trim().toLowerCase() : null,
        driverName: driverName || null,
        vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : null,
        coGuestsJson: coGuests && coGuests.length > 0 ? JSON.stringify(coGuests) : null,
        idDocumentType: idDocumentType || "AADHAAR",
        idDocumentNumber: idDocumentNumber || null,
        idPhotoUrl: idPhotoUrl || null,
        foreignPassportDetailsJson: foreignPassportDetails ? JSON.stringify(foreignPassportDetails) : null,
        signatureDataUrl: signatureDataUrl || null,
        termsAccepted: Boolean(termsAccepted),
        internalNotes: notes || null,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        action: "DIGITAL_CHECKIN_SUBMIT",
        targetType: "GUEST_REGISTRATION",
        targetId: registration.id,
        afterJson: JSON.stringify({ regNo: registration.registrationNo, name: registration.fullName }),
      },
    });

    // Permanently Archive Snapshot to /prisma/backups/grc_archives
    archiveGrcSnapshot(registration, "CREATED", "guest_self_service");

    return NextResponse.json(
      {
        success: true,
        registration,
        message: "Registration submitted successfully. Please proceed to Front Desk for key collection.",
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("Guest registration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
