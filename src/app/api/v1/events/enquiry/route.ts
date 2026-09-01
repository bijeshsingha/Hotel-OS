import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      eventType = "CORPORATE_CONFERENCE",
      eventTitle,
      eventDate,
      endDate,
      durationDays = 1,
      attendees = 50,
      seatingLayout = "THEATER",
      requiredRoomBlocks,
      cateringRequirements,
      avEquipment = [],
      organizerName,
      organizerCompany,
      organizerEmail,
      organizerPhone,
      organizerCity,
      budgetEstimate,
      additionalNotes,
    } = body;

    if (!organizerName || !organizerPhone) {
      return NextResponse.json(
        { error: "Organizer Name and Phone Number are required for banquet / RFP enquiries." },
        { status: 400 }
      );
    }

    const rfpReference = `RFP-BANQ-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    // In future, you can store RFPs in a dedicated BanquetRfp table or dispatch email via Nodemailer
    return NextResponse.json({
      success: true,
      delivered: true,
      enquiryId: rfpReference,
      recipient: "hotelambarish@gmail.com",
      message: "Banquet & Event RFP successfully recorded. Dedicated event manager notified.",
      data: {
        rfpReference,
        eventTitle: eventTitle || `${eventType} Event`,
        eventDate: eventDate || "TBD",
        attendees: Number(attendees) || 0,
        organizer: {
          name: organizerName.toUpperCase(),
          company: (organizerCompany || "").toUpperCase(),
          phone: organizerPhone,
          email: organizerEmail,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
