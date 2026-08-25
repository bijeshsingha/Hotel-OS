import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { OnboardingService } from "@/lib/onboarding/onboarding-service";
import { OnboardingPropertyData } from "@/lib/onboarding/types";

export async function GET() {
  try {
    const existingProperties = await prisma.property.findMany({
      select: {
        id: true,
        code: true,
        displayName: true,
        legalName: true,
        gstin: true,
        phone: true,
        email: true,
        businessDate: true,
        createdAt: true,
        _count: {
          select: {
            rooms: true,
            roomTypes: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const stateCodes = [
      { code: "18", name: "Assam" },
      { code: "17", name: "Meghalaya" },
      { code: "12", name: "Arunachal Pradesh" },
      { code: "14", name: "Manipur" },
      { code: "15", name: "Mizoram" },
      { code: "13", name: "Nagaland" },
      { code: "16", name: "Tripura" },
      { code: "11", name: "Sikkim" },
      { code: "19", name: "West Bengal" },
      { code: "07", name: "Delhi" },
      { code: "27", name: "Maharashtra" },
      { code: "29", name: "Karnataka" },
    ];

    const templates = [
      {
        id: "standard_hotel",
        title: "Standard Business & Leisure Hotel",
        description: "3 Room Types (Deluxe, Executive, Suite), 12% & 18% GST Slabs, Restaurant POS, and Standard Indian GRC sequences.",
        defaultRoomTypes: [
          { code: "DELUXE", name: "Deluxe Room", capacity: 2, extraCapacity: 1, baseRate: 2000, extraAdultRate: 500, extraChildRate: 250, bedType: "King Bed", amenities: ["Air Conditioning", "Free Wi-Fi", "Smart TV", "Ensuite Bathroom"] },
          { code: "EXECUTIVE", name: "Executive Room", capacity: 2, extraCapacity: 1, baseRate: 2500, extraAdultRate: 500, extraChildRate: 250, bedType: "King Bed", amenities: ["Air Conditioning", "Free Wi-Fi", "Work Desk", "Smart TV", "Mini Fridge"] },
          { code: "SUITE", name: "Suite Room", capacity: 3, extraCapacity: 2, baseRate: 5000, extraAdultRate: 500, extraChildRate: 250, bedType: "King Bed + Lounge", amenities: ["Air Conditioning", "High Speed Wi-Fi", "Living Area", "Bathtub", "Mini Bar"] }
        ]
      },
      {
        id: "boutique_resort",
        title: "Boutique Resort & Luxury Villa",
        description: "Premium Cottages, Luxury Pool Suites, 18% GST Accommodation, Spa & Wellness, Bar Outlets.",
        defaultRoomTypes: [
          { code: "PREMIUM_COTTAG", name: "Premium Garden Cottage", capacity: 2, extraCapacity: 1, baseRate: 4500, extraAdultRate: 1000, extraChildRate: 500, bedType: "King Bed", amenities: ["Balcony View", "Air Conditioning", "Wi-Fi", "Coffee Maker"] },
          { code: "VILLA_SUITE", name: "Luxury Villa Suite", capacity: 4, extraCapacity: 2, baseRate: 8500, extraAdultRate: 1500, extraChildRate: 750, bedType: "2 King Beds", amenities: ["Private Jacuzzi", "Private Lawn", "Butler Service", "Mini Bar"] }
        ]
      }
    ];

    return NextResponse.json({
      properties: existingProperties,
      stateCodes,
      templates
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: OnboardingPropertyData = await request.json();
    const result = await OnboardingService.onboardProperty(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to onboard property" }, { status: 400 });
  }
}
