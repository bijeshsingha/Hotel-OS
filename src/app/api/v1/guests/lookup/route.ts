import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get("phone") || "";
    const propertyId = searchParams.get("propertyId") || undefined;

    // Normalize phone number: strip spaces, dashes, +91 or leading 0
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      return NextResponse.json({ found: false, message: "Phone number too short for lookup" });
    }

    const last10Digits = digits.slice(-10);

    // 1. Search in Guest Registration (GRC Intake history) - freshest intake data
    const registration = await prisma.guestRegistration.findFirst({
      where: {
        mobilePhone: {
          contains: last10Digits,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Search in Guest Table (Master Guest profiles)
    const guest = await prisma.guest.findFirst({
      where: {
        phone: {
          contains: last10Digits,
        },
      },
      include: {
        documents: true,
        stays: {
          include: {
            roomAssignments: { include: { room: true } },
          },
          orderBy: { arrivalAt: "desc" },
        },
      },
    });

    // Count past stays from registrations and stays
    const pastRegCount = await prisma.guestRegistration.count({
      where: {
        mobilePhone: { contains: last10Digits },
      },
    });

    const pastStaysCount = Math.max(pastRegCount, guest?.stays?.length || 0);

    if (!registration && !guest) {
      return NextResponse.json({ found: false });
    }

    const reg = registration as any;
    const g = guest as any;

    // Parse address if in guest profile
    let parsedAddress: any = {};
    if (g?.addressJson) {
      try {
        parsedAddress = JSON.parse(g.addressJson);
      } catch (e) {}
    }

    // Determine ID document
    const doc = g?.documents?.[0];
    const idType = reg?.idDocumentType || reg?.idType || doc?.documentType || "AADHAAR";
    const idLast4 = reg?.idDocumentNumber || reg?.idLast4 || doc?.last4 || "";

    const lastStay = g?.stays?.[0];
    const lastRoom = lastStay?.roomAssignments?.[0]?.room?.number || reg?.assignedRoomNumber || reg?.preAssignedRoom;
    const lastStayDate = lastStay?.arrivalAt
      ? lastStay.arrivalAt.toISOString().split("T")[0]
      : reg?.arrivalDateTime?.split(" ")[0];

    const guestProfile = {
      id: g?.id || reg?.guestId || reg?.id,
      fullName: reg?.fullName || g?.name || "",
      title: reg?.title || "Mr.",
      fatherSpouseName: reg?.fatherSpouseName || "",
      age: reg?.age ? String(reg.age) : "",
      gender: reg?.gender || "Male",
      nationality: reg?.nationality || g?.nationality || "Indian",
      profession: reg?.profession || "",
      mobilePhone: reg?.mobilePhone || g?.phone || last10Digits,
      alternatePhone: reg?.alternatePhone || "",
      email: reg?.email || g?.email || "",

      // Address
      streetAddress: reg?.streetAddress || parsedAddress.street || "",
      policeStation: reg?.policeStation || parsedAddress.policeStation || "",
      city: reg?.city || parsedAddress.city || "",
      state: reg?.state || parsedAddress.state || "",
      pinZipCode: reg?.pinZipCode || parsedAddress.postalCode || "",
      country: reg?.country || parsedAddress.country || "India",

      // Travel History & Defaults
      arrivedFrom: reg?.arrivedFrom || "",
      goingTo: reg?.goingTo || "",
      purposeOfVisit: reg?.purposeOfVisit || "Tourism / Holiday",
      vehicleNumber: reg?.vehicleNumber || "",
      driverName: reg?.driverName || "",

      // ID Document & GST
      idType,
      idLast4,
      companyName: reg?.companyName || g?.companyName || "",
      guestGstin: reg?.guestGstin || g?.gstin || "",

      // Repeat Customer Stats
      isRepeatCustomer: true,
      pastStaysCount: pastStaysCount || 1,
      lastStayDate,
      lastRoom,
      preferences: g?.preferences || "",
      vipStatus: g?.riskNote?.includes("VIP") || false,
    };

    return NextResponse.json({
      found: true,
      guest: guestProfile,
    });
  } catch (error: any) {
    console.error("Guest lookup error:", error);
    return NextResponse.json({ error: error.message || "Guest lookup failed" }, { status: 500 });
  }
}
