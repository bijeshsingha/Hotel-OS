import { prisma } from "@/lib/db/prisma";
import { OnboardingPropertyData, OnboardingResult } from "./types";

export class OnboardingService {
  /**
   * Onboard and provision a complete new hotel property in Hotel OS
   */
  static async onboardProperty(data: OnboardingPropertyData): Promise<OnboardingResult> {
    // 1. Validation
    if (!data.displayName || !data.code || !data.legalName) {
      throw new Error("Property Display Name, Legal Name, and Property Code are required.");
    }

    const cleanCode = data.code.trim().toUpperCase();
    const existing = await prisma.property.findFirst({
      where: { code: cleanCode }
    });

    if (existing) {
      throw new Error(`A property with code '${cleanCode}' already exists (${existing.displayName}).`);
    }

    // 2. Resolve or Create Master Organization
    let org = await prisma.organization.findFirst({
      where: { status: "ACTIVE" }
    });

    if (!org) {
      const pan = data.gstin && data.gstin.length >= 12 ? data.gstin.substring(2, 12) : null;
      org = await prisma.organization.create({
        data: {
          legalName: data.legalName,
          displayName: data.displayName,
          pan: pan,
          address: JSON.stringify({
            street: data.address || "",
            city: data.city || "",
            state: data.state || "",
            postalCode: data.pinCode || "",
            country: "India"
          }),
          status: "ACTIVE"
        }
      });
    }

    // 3. Create Property
    const currentYear = new Date().getFullYear();
    const nextYearShort = String((currentYear + 1) % 100).padStart(2, "0");
    const currentYearShort = String(currentYear % 100).padStart(2, "0");
    const defaultFinYear = `${currentYear}-${currentYear + 1}`;
    const finYearCode = `${currentYearShort}${nextYearShort}`;

    const stateCode = data.stateCode || (data.gstin && data.gstin.length >= 2 ? data.gstin.substring(0, 2) : "18");
    const businessDate = data.businessDate || new Date().toISOString().split("T")[0];

    const property = await prisma.property.create({
      data: {
        organizationId: org.id,
        code: cleanCode,
        legalName: data.legalName,
        displayName: data.displayName,
        gstin: data.gstin || null,
        stateCode: stateCode,
        address: data.address ? `${data.address}, ${data.city || ""}, ${data.state || ""} - ${data.pinCode || ""}` : null,
        phone: data.phone || null,
        email: data.email || null,
        timezone: data.timezone || "Asia/Kolkata",
        currency: data.currency || "INR",
        checkinTime: data.checkinTime || "12:00",
        checkoutTime: data.checkoutTime || "11:00",
        auditCutoff: "03:00",
        businessDate: businessDate,
        status: "ACTIVE"
      }
    });

    // 4. Ensure Roles exist
    const systemRoles = [
      { code: "ORG_OWNER", name: "Organization Owner" },
      { code: "ADMIN_GM", name: "General Manager" },
      { code: "FD_MGR", name: "Front Desk Manager" },
      { code: "FD_AGENT", name: "Front Desk Agent" },
      { code: "HK_SUP", name: "Housekeeping Supervisor" },
      { code: "HK_ATT", name: "Housekeeping Attendant" },
      { code: "FNB_MGR", name: "F&B Manager" },
      { code: "ACCT", name: "Accountant" },
    ];

    for (const r of systemRoles) {
      await prisma.role.upsert({
        where: { code: r.code },
        update: { name: r.name },
        create: { code: r.code, name: r.name, scopeType: "PROPERTY", builtIn: true }
      });
    }

    // 5. Create Tax Profiles
    const tax12 = await prisma.taxProfile.create({
      data: {
        organizationId: org.id,
        propertyId: property.id,
        name: "GST 12% (Accommodation <= ₹7,500)",
        supplyType: "ACCOMMODATION",
        sacHsn: "996311",
        componentRatesJson: JSON.stringify({ cgst: 6, sgst: 6, igst: 12 }),
        inclusive: false,
        effectiveFrom: "2020-01-01",
        active: true
      }
    });

    const tax18 = await prisma.taxProfile.create({
      data: {
        organizationId: org.id,
        propertyId: property.id,
        name: "GST 18% (Accommodation > ₹7,500)",
        supplyType: "ACCOMMODATION",
        sacHsn: "996311",
        componentRatesJson: JSON.stringify({ cgst: 9, sgst: 9, igst: 18 }),
        inclusive: false,
        effectiveFrom: "2020-01-01",
        active: true
      }
    });

    const taxFood5 = await prisma.taxProfile.create({
      data: {
        organizationId: org.id,
        propertyId: property.id,
        name: "GST 5% (Restaurant / F&B)",
        supplyType: "RESTAURANT",
        sacHsn: "996331",
        componentRatesJson: JSON.stringify({ cgst: 2.5, sgst: 2.5, igst: 5 }),
        inclusive: false,
        effectiveFrom: "2020-01-01",
        active: true
      }
    });

    // 6. Create Document Sequences
    const docSeqs = [
      { type: "INVOICE", prefix: data.documentSequences?.invoicePrefix || `INV-${finYearCode}-`, nextValue: 1 },
      { type: "CREDIT_NOTE", prefix: data.documentSequences?.creditNotePrefix || `CN-${finYearCode}-`, nextValue: 1 },
      { type: "RECEIPT", prefix: data.documentSequences?.receiptPrefix || `REC-${finYearCode}-`, nextValue: 1 },
      { type: "RESERVATION", prefix: data.documentSequences?.reservationPrefix || `RES-${finYearCode}-`, nextValue: 1 },
      { type: "KOT", prefix: data.documentSequences?.kotPrefix || "KOT-", nextValue: 1 },
      { type: "ORDER", prefix: data.documentSequences?.orderPrefix || "ORD-", nextValue: 1 },
    ];

    for (const ds of docSeqs) {
      await prisma.documentSequence.create({
        data: {
          organizationId: org.id,
          propertyId: property.id,
          documentType: ds.type,
          scopeKey: "PROPERTY",
          financialYear: defaultFinYear,
          prefix: ds.prefix,
          nextValue: ds.nextValue,
          padding: 4
        }
      });
    }

    // 7. Create Charge Codes & Payment Methods
    const defaultChargeCodes = [
      { code: "ROOM_RENT", name: "Room Rent / Tariff", category: "ROOM", revenueGroup: "ROOM_REVENUE", taxProfileId: tax12.id },
      { code: "EXTRA_PAX", name: "Extra Adult / Bed Charge", category: "ROOM", revenueGroup: "ROOM_REVENUE", taxProfileId: tax12.id },
      { code: "FB_ROOM_SERVICE", name: "Food & Beverage (Room Service)", category: "FB", revenueGroup: "FB_REVENUE", taxProfileId: taxFood5.id },
      { code: "LAUNDRY", name: "Laundry Services", category: "LAUNDRY", revenueGroup: "OTHER_REVENUE", taxProfileId: tax18.id },
      { code: "MISC_CHARGES", name: "Miscellaneous Charges", category: "MISC", revenueGroup: "OTHER_REVENUE" },
    ];

    for (const cc of defaultChargeCodes) {
      await prisma.chargeCode.create({
        data: {
          organizationId: org.id,
          propertyId: property.id,
          code: cc.code,
          name: cc.name,
          category: cc.category,
          revenueGroup: cc.revenueGroup,
          taxProfileId: cc.taxProfileId || null,
          active: true
        }
      });
    }

    const defaultPaymentMethods = [
      { code: "CASH", name: "Cash", kind: "CASH" },
      { code: "CARD", name: "Credit / Debit Card", kind: "CARD", referenceRequired: true },
      { code: "UPI", name: "UPI / QR Code", kind: "DIGITAL", referenceRequired: true },
      { code: "BANK_TRANSFER", name: "Bank Transfer / NEFT", kind: "DIGITAL", referenceRequired: true },
      { code: "DIRECT_BILL", name: "Company Billing / City Ledger", kind: "CREDIT", referenceRequired: true },
      { code: "WALLET", name: "Advance Wallet Settlement", kind: "DIGITAL" },
    ];

    for (const pm of defaultPaymentMethods) {
      await prisma.paymentMethod.create({
        data: {
          organizationId: org.id,
          propertyId: property.id,
          code: pm.code,
          name: pm.name,
          kind: pm.kind,
          referenceRequired: pm.referenceRequired || false,
          supportsRefund: true,
          active: true
        }
      });
    }

    // 8. Create Outlets & Dining Tables
    const outletsToCreate = data.outlets && data.outlets.length > 0 ? data.outlets : [
      { code: "REST_MAIN", name: "Main Dining Restaurant", type: "RESTAURANT" as const, tableCount: 12 },
      { code: "ROOM_SERVICE", name: "In-Room Dining (IRD)", type: "ROOM_SERVICE" as const, tableCount: 0 },
    ];

    for (const out of outletsToCreate) {
      const createdOutlet = await prisma.outlet.create({
        data: {
          organizationId: org.id,
          propertyId: property.id,
          code: out.code,
          name: out.name,
          type: out.type,
          active: true
        }
      });

      if (out.tableCount && out.tableCount > 0) {
        for (let t = 1; t <= out.tableCount; t++) {
          await prisma.diningTable.create({
            data: {
              organizationId: org.id,
              propertyId: property.id,
              outletId: createdOutlet.id,
              name: `T-${String(t).padStart(2, "0")}`,
              section: "Main Dining",
              capacity: 4,
              active: true
            }
          });
        }
      }
    }

    // 9. Create Room Types & Standard Rate Plan
    const roomTypeMap = new Map<string, string>(); // code -> id

    const ratePlanEP = await prisma.ratePlan.create({
      data: {
        organizationId: org.id,
        propertyId: property.id,
        code: "EP",
        name: "Standard Room Only (EP)",
        mealPlan: "EP",
        cancellationPolicy: "Free cancellation up to 24 hours prior to check-in",
        priority: 1,
        active: true
      }
    });

    const roomTypesInput = data.roomTypes && data.roomTypes.length > 0 ? data.roomTypes : [
      {
        code: "DELUXE",
        name: "Deluxe Room",
        capacity: 2,
        extraCapacity: 1,
        baseRate: 2000,
        extraAdultRate: 500,
        extraChildRate: 250,
        bedType: "King Bed",
        amenities: ["Air Conditioning", "Free Wi-Fi", "Smart TV", "Ensuite Bathroom"]
      },
      {
        code: "EXECUTIVE",
        name: "Executive Room",
        capacity: 2,
        extraCapacity: 1,
        baseRate: 2500,
        extraAdultRate: 500,
        extraChildRate: 250,
        bedType: "King Bed",
        amenities: ["Air Conditioning", "Free Wi-Fi", "Work Desk", "Smart TV", "Mini Fridge"]
      },
      {
        code: "SUITE",
        name: "Suite Room",
        capacity: 3,
        extraCapacity: 2,
        baseRate: 5000,
        extraAdultRate: 500,
        extraChildRate: 250,
        bedType: "King Bed + Lounge",
        amenities: ["Air Conditioning", "High Speed Wi-Fi", "Living Area", "Bathtub", "Mini Bar"]
      }
    ];

    for (const rt of roomTypesInput) {
      const createdRt = await prisma.roomType.create({
        data: {
          organizationId: org.id,
          propertyId: property.id,
          code: rt.code.toUpperCase(),
          name: rt.name,
          capacity: rt.capacity || 2,
          extraCapacity: rt.extraCapacity || 1,
          baseOccupancy: 2,
          bedType: rt.bedType || "King Bed",
          amenities: JSON.stringify(rt.amenities || ["Air Conditioning", "Free Wi-Fi"]),
          active: true
        }
      });

      roomTypeMap.set(rt.code.toUpperCase(), createdRt.id);

      await prisma.ratePlanVersion.create({
        data: {
          ratePlanId: ratePlanEP.id,
          roomTypeId: createdRt.id,
          effectiveFrom: "2020-01-01",
          daysMask: "1111111",
          pricingJson: JSON.stringify({
            basePrice: rt.baseRate || 2000,
            extraAdult: rt.extraAdultRate || 500,
            extraChild: rt.extraChildRate || 250
          }),
          taxProfileId: tax12.id,
          active: true
        }
      });
    }

    // 10. Create Physical Rooms & RoomStates
    let roomsCreated = 0;
    const defaultDeluxeId = roomTypeMap.get("DELUXE") || Array.from(roomTypeMap.values())[0] || "";

    if (data.rooms && data.rooms.length > 0) {
      for (const rm of data.rooms) {
        const rtId = (rm.roomTypeCode ? roomTypeMap.get(rm.roomTypeCode.toUpperCase()) : null) || defaultDeluxeId;
        const cleanNum = String(rm.number).trim();

        await prisma.room.create({
          data: {
            organizationId: org.id,
            propertyId: property.id,
            roomTypeId: rtId,
            number: cleanNum,
            name: `Room ${cleanNum}`,
            floor: rm.floor || 1,
            wing: rm.wing || null,
            sortOrder: parseInt(cleanNum, 10) || 100,
            active: true,
            roomState: {
              create: {
                organizationId: org.id,
                propertyId: property.id,
                housekeepingStatus: "CLEAN",
                occupancyStatus: "VACANT",
                sellabilityStatus: "SELLABLE"
              }
            }
          }
        });
        roomsCreated++;
      }
    }

    // 11. Create Initial Staff Users
    let usersCreated = 0;
    const defaultStaff = data.staffUsers && data.staffUsers.length > 0 ? data.staffUsers : [
      {
        name: `${data.displayName} Admin`,
        email: `admin.${cleanCode.toLowerCase()}@hotelos.in`,
        phone: data.phone,
        roleCode: "ORG_OWNER" as const
      },
      {
        name: `${data.displayName} Front Desk`,
        email: `reception.${cleanCode.toLowerCase()}@hotelos.in`,
        phone: data.phone,
        roleCode: "FD_MGR" as const
      }
    ];

    for (const staff of defaultStaff) {
      const user = await prisma.user.upsert({
        where: { email: staff.email },
        update: { name: staff.name, phone: staff.phone || null },
        create: {
          name: staff.name,
          email: staff.email,
          phone: staff.phone || null,
          status: "ACTIVE"
        }
      });

      const membership = await prisma.membership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: org.id
          }
        },
        update: { status: "ACTIVE" },
        create: {
          userId: user.id,
          organizationId: org.id,
          status: "ACTIVE"
        }
      });

      const targetRole = await prisma.role.findUnique({
        where: { code: staff.roleCode }
      }) || await prisma.role.findUnique({ where: { code: "ORG_OWNER" } });

      if (targetRole) {
        await prisma.propertyGrant.upsert({
          where: {
            membershipId_propertyId_roleId: {
              membershipId: membership.id,
              propertyId: property.id,
              roleId: targetRole.id
            }
          },
          update: {},
          create: {
            membershipId: membership.id,
            propertyId: property.id,
            roleId: targetRole.id
          }
        });
      }
      usersCreated++;
    }

    return {
      success: true,
      propertyId: property.id,
      propertyCode: property.code,
      propertyName: property.displayName,
      roomsCreated: roomsCreated,
      roomTypesCreated: roomTypeMap.size,
      usersCreated: usersCreated,
      message: `Property '${property.displayName}' (${property.code}) successfully onboarded with ${roomsCreated} rooms, ${roomTypeMap.size} room types, and GST compliant masters.`
    };
  }
}
