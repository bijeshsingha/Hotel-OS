import { NextRequest, NextResponse } from "next/server";
import {
  syncRoomsFromYashraj,
  syncMenuFromYashraj,
  syncGuestsFromYashraj,
  syncAllFromYashraj,
} from "@/lib/sync/yashraj-sync";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const scope = body.scope || "all";

    // Resolve propertyId
    let propertyId = body.propertyId;
    if (!propertyId) {
      const prop = await prisma.property.findFirst();
      if (!prop) {
        return NextResponse.json(
          { error: "No active property found in Hotel OS to sync into." },
          { status: 400 }
        );
      }
      propertyId = prop.id;
    }

    let result: any = null;

    switch (scope) {
      case "rooms":
        result = await syncRoomsFromYashraj(propertyId);
        break;
      case "menu":
        result = await syncMenuFromYashraj(propertyId);
        break;
      case "guests":
        result = await syncGuestsFromYashraj(propertyId, body.limit || 500);
        break;
      case "all":
      default:
        result = await syncAllFromYashraj(propertyId);
        break;
    }

    return NextResponse.json({
      success: true,
      scope,
      propertyId,
      result,
    });
  } catch (error: any) {
    console.error("Yashraj sync execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute synchronization from Yashraj",
      },
      { status: 500 }
    );
  }
}
