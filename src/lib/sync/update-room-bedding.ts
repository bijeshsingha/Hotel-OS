import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const mapping: Record<
  string,
  { bed: "KING" | "TWIN"; type: string; wing: string; name: string }
> = {
  "207": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "206": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "301": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "302": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "303": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "304": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "305": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "306": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "308": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "309": { bed: "TWIN", type: "rt_exec_twin", wing: "EXECUTIVE", name: "Executive Twin Room" },
  "310": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "311": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "401": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "402": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "403": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "404": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "405": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "406": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "408": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "409": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "410": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "411": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "501": { bed: "KING", type: "rt_deluxe_king", wing: "DELUXE", name: "Deluxe King Room" },
  "502": { bed: "KING", type: "rt_suite", wing: "SUITE", name: "Suite Room" },
  "503": { bed: "KING", type: "rt_exec_king", wing: "EXECUTIVE", name: "Executive King Room" },
  "504": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "505": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "506": { bed: "TWIN", type: "rt_deluxe_twin", wing: "DELUXE", name: "Deluxe Twin Room" },
  "507": { bed: "KING", type: "rt_suite", wing: "SUITE", name: "Suite Room" },
  "601": { bed: "TWIN", type: "rt_exec_twin", wing: "EXECUTIVE", name: "Executive Twin Room" },
  "602": { bed: "TWIN", type: "rt_exec_twin", wing: "EXECUTIVE", name: "Executive Twin Room" },
  "604": { bed: "KING", type: "rt_exec_king", wing: "EXECUTIVE", name: "Executive King Room" },
  "605": { bed: "KING", type: "rt_exec_king", wing: "EXECUTIVE", name: "Executive King Room" },
  "606": { bed: "TWIN", type: "rt_exec_twin", wing: "EXECUTIVE", name: "Executive Twin Room" },
  "607": { bed: "TWIN", type: "rt_exec_twin", wing: "EXECUTIVE", name: "Executive Twin Room" },
};

async function main() {
  const property = await prisma.property.findFirst();
  if (!property) throw new Error("No property found");

  console.log(`Updating bedding info for Property: ${property.displayName} (${property.id})`);

  for (const [roomNum, conf] of Object.entries(mapping)) {
    const rm = await prisma.room.findFirst({
      where: { propertyId: property.id, number: roomNum },
    });

    if (rm) {
      await prisma.room.update({
        where: { id: rm.id },
        data: {
          roomTypeId: conf.type,
          wing: conf.wing,
          name: conf.name,
        },
      });
      console.log(`✓ Room ${roomNum}: ${conf.wing} • ${conf.name} [${conf.bed} BED]`);
    } else {
      console.warn(`⚠️ Room ${roomNum} not found in DB!`);
    }
  }

  // Summary breakdown
  const rooms = await prisma.room.findMany({
    where: { propertyId: property.id },
    include: { roomType: true },
    orderBy: { number: "asc" },
  });

  const suites = rooms.filter((r) => r.wing === "SUITE");
  const execs = rooms.filter((r) => r.wing === "EXECUTIVE");
  const deluxes = rooms.filter((r) => r.wing === "DELUXE");

  const kingRooms = rooms.filter((r) => mapping[r.number]?.bed === "KING");
  const twinRooms = rooms.filter((r) => mapping[r.number]?.bed === "TWIN");

  console.log("\n==============================================");
  console.log(`TOTAL ROOMS: ${rooms.length}`);
  console.log(`👑 SUITE (${suites.length}): ${suites.map((r) => `${r.number} [${mapping[r.number]?.bed}]`).join(", ")}`);
  console.log(`💼 EXECUTIVE (${execs.length}): ${execs.map((r) => `${r.number} [${mapping[r.number]?.bed}]`).join(", ")}`);
  console.log(`🛏️ DELUXE (${deluxes.length}): ${deluxes.map((r) => `${r.number} [${mapping[r.number]?.bed}]`).join(", ")}`);
  console.log("----------------------------------------------");
  console.log(`🛏️ TOTAL KING BEDS (${kingRooms.length}): ${kingRooms.map((r) => r.number).join(", ")}`);
  console.log(`🛏️🛏️ TOTAL TWIN BEDS (${twinRooms.length}): ${twinRooms.map((r) => r.number).join(", ")}`);
  console.log("==============================================\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
