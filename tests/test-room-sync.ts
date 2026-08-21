import { prisma } from "../src/lib/db/prisma";

async function main() {
  const rooms = await prisma.room.findMany({ orderBy: { number: "asc" } });
  const stays = await prisma.stay.findMany({
    where: { status: "IN_HOUSE" },
    include: { primaryGuest: true },
  });

  // Clear existing active assignments first
  await prisma.roomAssignment.deleteMany({});

  const roomMap: { [guestName: string]: string } = {
    "Arjun Singhania": "101",
    "Meera Sen": "102",
    "Dr. Alok Bordoloi": "201",
    "BIJESH SINGHA": "203",
  };

  for (const s of stays) {
    const guestName = s.primaryGuest?.name || "";
    const targetRoomNum = roomMap[guestName] || "103";
    const targetRoom = rooms.find((r) => r.number === targetRoomNum);

    if (targetRoom) {
      await prisma.roomAssignment.create({
        data: {
          stayId: s.id,
          roomId: targetRoom.id,
          startsAt: new Date(),
        },
      });
      console.log(`Assigned ${guestName} to Room ${targetRoom.number}`);
    }
  }

  const occupied = await prisma.room.findMany({
    where: { assignments: { some: { endsAt: null } } },
    include: {
      assignments: {
        where: { endsAt: null },
        include: {
          stay: {
            include: { primaryGuest: true, folio: { include: { windows: { include: { entries: true } } } } },
          },
        },
      },
    },
  });

  console.log(
    "Distinct Occupied Rooms:",
    occupied.map((r) => ({
      room: r.number,
      guest: r.assignments[0]?.stay?.primaryGuest?.name,
      phone: r.assignments[0]?.stay?.primaryGuest?.phone,
    }))
  );
}

main().catch(console.error);
