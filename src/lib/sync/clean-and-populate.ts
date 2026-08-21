import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/db/prisma";

const execAsync = promisify(exec);

const DB_NAME = "DV_20212022";
const SERVER_NAME = "localhost\\SQLEXPRESS";

async function queryYashrajJson<T>(query: string): Promise<T | null> {
  const psScript = `
$ProgressPreference = 'SilentlyContinue'
$connectionString = "Server=${SERVER_NAME};Database=${DB_NAME};Integrated Security=True;TrustServerCertificate=True;ApplicationIntent=ReadOnly;"
$connection = New-Object System.Data.SqlClient.SqlConnection($connectionString)
try {
    $connection.Open()
    $cmd = $connection.CreateCommand()
    $cmd.CommandText = @"
${query}
"@
    $reader = $cmd.ExecuteReader()
    $sb = New-Object System.Text.StringBuilder
    while ($reader.Read()) {
        if (-not $reader.IsDBNull(0)) {
            [void]$sb.Append($reader.GetString(0))
        }
    }
    $reader.Close()
    Write-Output $sb.ToString()
} catch {
    Write-Error $_.Exception.Message
} finally {
    $connection.Close()
}
`;

  try {
    const encoded = Buffer.from(psScript, "utf16le").toString("base64");
    const { stdout, stderr } = await execAsync(
      `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`,
      { maxBuffer: 100 * 1024 * 1024 }
    );

    if (stderr && !stdout) {
      console.error("Yashraj query error:", stderr);
      return null;
    }

    const trimmed = stdout.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as T;
  } catch (error) {
    console.error("Yashraj execution error:", error);
    return null;
  }
}

export async function resetAndPopulateFromYashraj() {
  console.log("=== STARTING CLEAN YASHRAJ MIGRATION ===");

  const prop = await prisma.property.findFirst();
  if (!prop) throw new Error("No property found in Hotel OS");

  // 1. Update Property Profile
  await prisma.property.update({
    where: { id: prop.id },
    data: {
      displayName: "HOTEL DIVINE VIEW",
      code: "HDW",
      address: "Station Road, Paltan Bazaar, Guwahati, Assam 781008",
      phone: "+91 91016 97070",
      email: "info@hoteldivineview.com",
    },
  });
  console.log("Updated property details for HOTEL DIVINE VIEW.");

  // 2. Fetch all 77 real rooms from Yashraj
  const yashrajRooms = await queryYashrajJson<any[]>(`
SELECT 
    r.RID as id,
    r.RoomNo as number,
    r.FloorNo as floor,
    ISNULL(t.TypeName, 'DELUXE') as typeName,
    ISNULL(t.ShortName, 'DL') as typeCode,
    CASE 
        WHEN t.TypeName LIKE '%FAM%' THEN 3000
        WHEN t.TypeName LIKE '%EXEC%' THEN 2500
        ELSE 2000
    END as tariff,
    r.IsCheckIn as isCheckIn,
    r.RoomStatus as roomStatus
FROM M_RoomMaster r
LEFT JOIN M_RoomType t ON t.TypeId = TRY_CAST(r.RoomType as INT)
WHERE r.DeleteStatus = 'N'
ORDER BY CAST(r.FloorNo as INT), CAST(r.RoomNo as INT)
FOR JSON PATH
`);

  if (!yashrajRooms || yashrajRooms.length === 0) {
    throw new Error("Failed to fetch rooms from Yashraj SQL Server");
  }

  const validRoomNumbers = new Set(yashrajRooms.map((r) => String(r.number)));
  console.log(`Fetched ${yashrajRooms.length} real rooms from Yashraj.`);

  // 3. Remove old dummy rooms from Hotel OS
  const existingRooms = await prisma.room.findMany({
    where: { propertyId: prop.id },
    select: { id: true, number: true },
  });

  const dummyRoomsToDelete = existingRooms.filter((r) => !validRoomNumbers.has(r.number));
  console.log(`Found ${dummyRoomsToDelete.length} dummy rooms to purge from Hotel OS.`);

  for (const dr of dummyRoomsToDelete) {
    // Delete associated relations first
    await prisma.roomState.deleteMany({ where: { roomId: dr.id } });
    await prisma.roomAssignment.deleteMany({ where: { roomId: dr.id } });
    await prisma.roomBlock.deleteMany({ where: { roomId: dr.id } });
    await prisma.housekeepingTask.deleteMany({ where: { roomId: dr.id } });
    await prisma.maintenanceIssue.deleteMany({ where: { roomId: dr.id } });
    await prisma.room.delete({ where: { id: dr.id } });
  }
  console.log("Purged old dummy rooms.");

  // 4. Setup Yashraj Room Types in Hotel OS
  const roomTypeMap = new Map<string, string>();
  const distinctTypes = Array.from(new Set(yashrajRooms.map((r) => r.typeName)));

  for (const tName of distinctTypes) {
    const isFamily = tName.toLowerCase().includes("fam");
    const isExec = tName.toLowerCase().includes("exec");
    const code = isFamily ? "FAM_EXEC" : isExec ? "EXEC" : "DELUXE";
    const capacity = isFamily ? 4 : 2;

    const rt = await prisma.roomType.upsert({
      where: {
        propertyId_code: {
          propertyId: prop.id,
          code,
        },
      },
      update: {
        name: tName,
        capacity,
      },
      create: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        code,
        name: tName,
        capacity,
      },
    });

    roomTypeMap.set(tName, rt.id);
  }

  // 5. Upsert all 77 real Yashraj Rooms into Hotel OS
  for (const yr of yashrajRooms) {
    const rtId = roomTypeMap.get(yr.typeName) || Array.from(roomTypeMap.values())[0];
    const floorNumber = parseInt(yr.floor, 10) || 1;
    const wingName = `Floor ${floorNumber}`;

    const room = await prisma.room.upsert({
      where: {
        propertyId_number: {
          propertyId: prop.id,
          number: String(yr.number),
        },
      },
      update: {
        floor: floorNumber,
        wing: wingName,
        roomTypeId: rtId,
        name: `Room ${yr.number}`,
      },
      create: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        roomTypeId: rtId,
        number: String(yr.number),
        name: `Room ${yr.number}`,
        floor: floorNumber,
        wing: wingName,
      },
    });

    const isOccupied = yr.isCheckIn === "Y";
    const isDirty = yr.roomStatus === "H" || yr.roomStatus === "D";
    const isOutOfOrder = yr.roomStatus === "O";

    await prisma.roomState.upsert({
      where: { roomId: room.id },
      update: {
        occupancyStatus: isOccupied ? "OCCUPIED" : "VACANT",
        housekeepingStatus: isDirty ? "DIRTY" : "CLEAN",
        sellabilityStatus: isOutOfOrder ? "OUT_OF_ORDER" : "SELLABLE",
      },
      create: {
        organizationId: prop.organizationId,
        propertyId: prop.id,
        roomId: room.id,
        occupancyStatus: isOccupied ? "OCCUPIED" : "VACANT",
        housekeepingStatus: isDirty ? "DIRTY" : "CLEAN",
        sellabilityStatus: isOutOfOrder ? "OUT_OF_ORDER" : "SELLABLE",
      },
    });
  }
  console.log(`Populated all ${yashrajRooms.length} real rooms into Hotel OS.`);

  // 6. Reset & Populate Restaurant POS Menu with real 87 Yashraj items
  const yashrajMenu = await queryYashrajJson<any[]>(`
SELECT 
    m.MenuID as id,
    m.MenuName as name,
    ISNULL(m.SrtName, '') as code,
    ISNULL(d.MenuRate, ISNULL(m.PurchaseRate, 120)) as price,
    ISNULL(m.CategoryName, 'Main Course') as category,
    ISNULL(m.KitchenName, 'Main Kitchen') as kitchen,
    ISNULL(m.Veg, 'Veg') as vegStatus
FROM M_R_MenuMaster m
LEFT JOIN M_R_MenuMasterDetails d ON d.MenuID = m.MenuID AND d.DeleteStatus = 'N'
WHERE m.DeleteStatus = 'N'
ORDER BY m.CategoryName, m.MenuName
FOR JSON PATH
`);

  if (yashrajMenu && yashrajMenu.length > 0) {
    let outlet = await prisma.outlet.findFirst({
      where: { propertyId: prop.id, type: "RESTAURANT" },
    });

    if (!outlet) {
      outlet = await prisma.outlet.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          code: "DIVINE_DINE",
          name: "Divine Multi-Cuisine Restaurant",
          type: "RESTAURANT",
          supportedModes: "DINE_IN,TAKEAWAY,ROOM_SERVICE",
        },
      });
    }

    let kitchen = await prisma.kitchenStation.findFirst({
      where: { propertyId: prop.id, outletId: outlet.id },
    });

    if (!kitchen) {
      kitchen = await prisma.kitchenStation.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          outletId: outlet.id,
          code: "MAIN_KITCHEN",
          name: "Main Kitchen",
        },
      });
    }

    // Delete old dummy menu items that don't belong to Yashraj
    const yashrajItemCodes = new Set(yashrajMenu.map((m) => m.code ? String(m.code).trim() : `ITM-${m.id}`));
    const existingMenuItems = await prisma.menuItem.findMany({
      where: { propertyId: prop.id },
      select: { id: true, code: true },
    });

    for (const em of existingMenuItems) {
      if (!yashrajItemCodes.has(em.code)) {
        await prisma.menuItemVariant.deleteMany({ where: { menuItemId: em.id } });
        await prisma.menuItem.delete({ where: { id: em.id } });
      }
    }

    const catMap = new Map<string, string>();
    for (const item of yashrajMenu) {
      const catName = item.category || "General Menu";
      if (!catMap.has(catName)) {
        let cat = await prisma.menuCategory.findFirst({
          where: { propertyId: prop.id, outletId: outlet.id, name: catName },
        });
        if (!cat) {
          cat = await prisma.menuCategory.create({
            data: {
              organizationId: prop.organizationId,
              propertyId: prop.id,
              outletId: outlet.id,
              name: catName,
              sortOrder: catMap.size + 1,
            },
          });
        }
        catMap.set(catName, cat.id);
      }

      const catId = catMap.get(catName)!;
      const itemCode = item.code ? String(item.code).trim() : `ITM-${item.id}`;

      const menuItem = await prisma.menuItem.upsert({
        where: {
          categoryId_code: {
            categoryId: catId,
            code: itemCode,
          },
        },
        update: {
          name: item.name,
          description: `${item.vegStatus || "Food"} • Category: ${catName}`,
        },
        create: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          categoryId: catId,
          code: itemCode,
          name: item.name,
          description: `${item.vegStatus || "Food"} • Category: ${catName}`,
        },
      });

      const price = Number(item.price) || 120;
      const existingVar = await prisma.menuItemVariant.findFirst({
        where: { menuItemId: menuItem.id },
      });

      if (existingVar) {
        await prisma.menuItemVariant.update({
          where: { id: existingVar.id },
          data: { price, stationId: kitchen.id },
        });
      } else {
        await prisma.menuItemVariant.create({
          data: {
            menuItemId: menuItem.id,
            name: "Standard",
            price,
            stationId: kitchen.id,
          },
        });
      }
    }
    console.log(`Populated ${yashrajMenu.length} real F&B menu items.`);
  }

  // 7. Populate Recent Guest Records from Yashraj
  const yashrajGuests = await queryYashrajJson<any[]>(`
SELECT TOP 500
    g.RegID as id,
    g.GuestName as name,
    ISNULL(g.ContactNo, '') as phone,
    ISNULL(g.E_Mail, '') as email,
    ISNULL(g.Address, '') as address,
    ISNULL(g.PinCode, '') as pinCode,
    ISNULL(g.IDNo, '') as idNumber,
    ISNULL(g.Gender, 'Male') as gender,
    ISNULL(g.Age, 35) as age
FROM M_GuestRegistrationMaster g
WHERE g.DeleteStatus = 'N' AND g.GuestName IS NOT NULL AND LEN(g.GuestName) > 2
ORDER BY g.RegID DESC
FOR JSON PATH
`);

  if (yashrajGuests && yashrajGuests.length > 0) {
    let guestsAdded = 0;
    for (const yg of yashrajGuests) {
      const phone = yg.phone ? yg.phone.trim() : null;
      const name = yg.name.trim();

      let exists = null;
      if (phone && phone.length >= 7) {
        exists = await prisma.guest.findFirst({
          where: { organizationId: prop.organizationId, phone },
        });
      }

      if (!exists) {
        await prisma.guest.create({
          data: {
            organizationId: prop.organizationId,
            name,
            phone: phone || undefined,
            email: yg.email ? yg.email.trim().toLowerCase() : undefined,
            addressJson: yg.address || yg.pinCode
              ? JSON.stringify({
                  street: yg.address || "",
                  postalCode: yg.pinCode || "",
                  country: "India",
                })
              : undefined,
            nationality: "Indian",
          },
        });
        guestsAdded++;
      }
    }
    console.log(`Imported ${guestsAdded} guest profiles from Yashraj.`);
  }

  console.log("=== CLEAN YASHRAJ MIGRATION COMPLETE ===");

  const finalRoomCount = await prisma.room.count({ where: { propertyId: prop.id } });
  const finalMenuCount = await prisma.menuItem.count({ where: { propertyId: prop.id } });
  const finalGuestCount = await prisma.guest.count({ where: { organizationId: prop.organizationId } });

  return {
    success: true,
    property: "HOTEL DIVINE VIEW",
    roomsCount: finalRoomCount,
    menuItemsCount: finalMenuCount,
    guestsCount: finalGuestCount,
  };
}
