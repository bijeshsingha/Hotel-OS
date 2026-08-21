import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "@/lib/db/prisma";

const execAsync = promisify(exec);

const DB_NAME = "DV_20212022";
const SERVER_NAME = "localhost\\SQLEXPRESS";

/**
 * Execute a read-only SQL Server query via PowerShell and return parsed JSON
 */
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
      { maxBuffer: 100 * 1024 * 1024 } // 100MB buffer for large historical datasets
    );

    if (stderr && !stdout) {
      console.error("Yashraj SQL error:", stderr);
      return null;
    }

    const trimmed = stdout.trim();
    if (!trimmed) return null;
    return JSON.parse(trimmed) as T;
  } catch (error) {
    console.error("Yashraj connection execution error:", error);
    return null;
  }
}

export interface YashrajStatus {
  connected: boolean;
  server: string;
  database: string;
  totalRooms: number;
  occupiedRooms: number;
  totalGuests: number;
  activeBookings: number;
  totalMenuItems: number;
  lastCheckedAt: string;
}

/**
 * Check connection status and counts in Yashraj database
 */
export async function getYashrajStatus(): Promise<YashrajStatus> {
  const query = `
SELECT 
    (SELECT COUNT(*) FROM M_RoomMaster WHERE DeleteStatus = 'N') as totalRooms,
    (SELECT COUNT(*) FROM M_RoomMaster WHERE DeleteStatus = 'N' AND IsCheckIn = 'Y') as occupiedRooms,
    (SELECT COUNT(*) FROM M_GuestRegistrationMaster WHERE DeleteStatus = 'N') as totalGuests,
    (SELECT COUNT(*) FROM M_AdvanceBookingMaster WHERE DeleteStatus = 'N' AND RegStatus = 'B') as activeBookings,
    (SELECT COUNT(*) FROM M_R_MenuMaster WHERE DeleteStatus = 'N') as totalMenuItems
FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
`;

  const data = await queryYashrajJson<any>(query);

  if (!data) {
    return {
      connected: false,
      server: SERVER_NAME,
      database: DB_NAME,
      totalRooms: 0,
      occupiedRooms: 0,
      totalGuests: 0,
      activeBookings: 0,
      totalMenuItems: 0,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  return {
    connected: true,
    server: SERVER_NAME,
    database: DB_NAME,
    totalRooms: data.totalRooms || 0,
    occupiedRooms: data.occupiedRooms || 0,
    totalGuests: data.totalGuests || 0,
    activeBookings: data.activeBookings || 0,
    totalMenuItems: data.totalMenuItems || 0,
    lastCheckedAt: new Date().toISOString(),
  };
}

/**
 * 1. Sync Rooms and Categories from Yashraj
 */
export async function syncRoomsFromYashraj(propertyId: string) {
  const query = `
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
ORDER BY CAST(r.RoomNo as INT)
FOR JSON PATH
`;

  const yashrajRooms = await queryYashrajJson<any[]>(query);
  if (!yashrajRooms || yashrajRooms.length === 0) {
    throw new Error("No rooms found in Yashraj database");
  }

  const prop = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!prop) throw new Error("Property not found in Hotel OS");

  // Upsert Room Types
  const roomTypesMap = new Map<string, string>();
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

    roomTypesMap.set(tName, rt.id);
  }

  // Upsert Rooms and RoomState
  let syncedCount = 0;
  for (const yr of yashrajRooms) {
    const rtId = roomTypesMap.get(yr.typeName) || Array.from(roomTypesMap.values())[0];
    const floorNumber = parseInt(yr.floor, 10) || 1;

    const room = await prisma.room.upsert({
      where: {
        propertyId_number: {
          propertyId: prop.id,
          number: String(yr.number),
        },
      },
      update: {
        floor: floorNumber,
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
        wing: floorNumber >= 5 ? "Upper Wing" : "Main Wing",
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

    syncedCount++;
  }

  return {
    success: true,
    totalRoomsSynced: syncedCount,
    roomTypesCount: distinctTypes.length,
  };
}

/**
 * 2. Sync Restaurant F&B Menu Items from Yashraj
 */
export async function syncMenuFromYashraj(propertyId: string) {
  const query = `
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
`;

  const yashrajMenuItems = await queryYashrajJson<any[]>(query);
  if (!yashrajMenuItems || yashrajMenuItems.length === 0) {
    throw new Error("No menu items found in Yashraj database");
  }

  const prop = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!prop) throw new Error("Property not found in Hotel OS");

  // Ensure default F&B Outlet
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

  // Ensure Kitchen Station
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

  // Upsert Categories & Items
  const categoryMap = new Map<string, string>();
  let itemsSynced = 0;

  for (const item of yashrajMenuItems) {
    const catName = item.category || "General Menu";

    if (!categoryMap.has(catName)) {
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
            sortOrder: categoryMap.size + 1,
          },
        });
      }
      categoryMap.set(catName, cat.id);
    }

    const catId = categoryMap.get(catName)!;
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

    const price = Number(item.price) || 200;

    const existingVariant = await prisma.menuItemVariant.findFirst({
      where: { menuItemId: menuItem.id },
    });

    if (existingVariant) {
      await prisma.menuItemVariant.update({
        where: { id: existingVariant.id },
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

    itemsSynced++;
  }

  return {
    success: true,
    totalItemsSynced: itemsSynced,
    totalCategories: categoryMap.size,
  };
}

/**
 * 3. Sync Recent Guest History from Yashraj
 */
export async function syncGuestsFromYashraj(propertyId: string, limit = 500) {
  const query = `
SELECT TOP ${limit}
    g.RegID as id,
    g.GuestName as name,
    ISNULL(g.ContactNo, '') as phone,
    ISNULL(g.E_Mail, '') as email,
    ISNULL(g.Address, '') as address,
    ISNULL(g.PinCode, '') as pinCode,
    ISNULL(g.IDNo, '') as idNumber,
    CASE 
        WHEN g.IDTypeID = 1 THEN 'AADHAAR'
        WHEN g.IDTypeID = 2 THEN 'PASSPORT'
        WHEN g.IDTypeID = 3 THEN 'DRIVING_LICENSE'
        ELSE 'VOTER_ID'
    END as idType,
    ISNULL(g.Gender, 'Male') as gender,
    ISNULL(g.Age, 35) as age
FROM M_GuestRegistrationMaster g
WHERE g.DeleteStatus = 'N' AND g.GuestName IS NOT NULL AND LEN(g.GuestName) > 2
ORDER BY g.RegID DESC
FOR JSON PATH
`;

  const yashrajGuests = await queryYashrajJson<any[]>(query);
  if (!yashrajGuests || yashrajGuests.length === 0) {
    return { success: true, syncedGuests: 0 };
  }

  const prop = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!prop) throw new Error("Property not found in Hotel OS");

  let synced = 0;
  for (const yg of yashrajGuests) {
    const phone = yg.phone ? yg.phone.trim() : null;
    const name = yg.name.trim();

    let existingGuest = null;
    if (phone && phone.length >= 7) {
      existingGuest = await prisma.guest.findFirst({
        where: { organizationId: prop.organizationId, phone },
      });
    }

    if (!existingGuest) {
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
      synced++;
    }
  }

  return {
    success: true,
    syncedGuests: synced,
    totalQueried: yashrajGuests.length,
  };
}

/**
 * 4. Master Sync: Execute Full Synchronization
 */
export async function syncAllFromYashraj(propertyId: string) {
  const roomsResult = await syncRoomsFromYashraj(propertyId);
  const menuResult = await syncMenuFromYashraj(propertyId);
  const guestResult = await syncGuestsFromYashraj(propertyId, 250);

  return {
    success: true,
    rooms: roomsResult,
    menu: menuResult,
    guests: guestResult,
    syncedAt: new Date().toISOString(),
  };
}
