import { prisma } from "../db/prisma";

const INDIAN_GUEST_NAMES = [
  { name: "BIJESH SINGHA", phone: "+91 70024 49198", email: "singhabijesh7@gmail.com", city: "Guwahati", state: "Assam" },
  { name: "DR. ALOK BORDOLOI", phone: "+91 99540 12345", email: "alok.bordoloi@gmail.com", city: "Jorhat", state: "Assam" },
  { name: "ARJUN SINGHANIA", phone: "+91 98201 11223", email: "arjun.singhania@apexcorp.in", city: "Mumbai", state: "Maharashtra" },
  { name: "MEERA SEN", phone: "+91 98310 44556", email: "meera.sen@kolkatamedia.com", city: "Kolkata", state: "West Bengal" },
  { name: "DR. SUNITA & RAJESH BARMAN", phone: "+91 94350 11223", email: "dr.barman@guwahaticlinic.org", city: "Dibrugarh", state: "Assam" },
  { name: "ANUPAM ROY", phone: "+91 98640 55443", email: "anupam.roy@assamtech.com", city: "Silchar", state: "Assam" },
  { name: "PRIYANKA SENGUPTA", phone: "+91 98301 77665", email: "priyanka.s@gmail.com", city: "Kolkata", state: "West Bengal" },
  { name: "TANMAY HAZARIKA", phone: "+91 98641 22334", email: "tanmay.hazarika@gmail.com", city: "Tezpur", state: "Assam" },
  { name: "VIKRAM GOEL", phone: "+91 98110 88990", email: "vgoel@delhicapital.com", city: "New Delhi", state: "Delhi" },
  { name: "SNEHA PHUKAN", phone: "+91 94351 66778", email: "sneha.phukan@oilindia.in", city: "Duliajan", state: "Assam" },
  { name: "ROHIT AGARWALLA", phone: "+91 97060 33445", email: "rohit.agarwalla@gmail.com", city: "Guwahati", state: "Assam" },
  { name: "KAVITA SHARMA", phone: "+91 98290 11223", email: "kavita.sharma@jaipurcrafts.com", city: "Jaipur", state: "Rajasthan" },
  { name: "DEBOJIT CHOUDHURY", phone: "+91 98642 99887", email: "debojit.c@gmail.com", city: "Nagaon", state: "Assam" },
  { name: "SANJEEV VERMA", phone: "+91 98100 44556", email: "sverma@infraventures.com", city: "Noida", state: "Uttar Pradesh" },
  { name: "ANANYA DASGUPTA", phone: "+91 98305 66778", email: "ananya.dg@designstudio.in", city: "Kolkata", state: "West Bengal" },
  { name: "PRANAB KALITA", phone: "+91 98640 11229", email: "pranab.kalita@bhel.in", city: "Guwahati", state: "Assam" },
  { name: "RAJESH NAIR", phone: "+91 98470 22334", email: "rnair@cochinlogistics.com", city: "Kochi", state: "Kerala" },
  { name: "NIDHI MAHESHWARI", phone: "+91 98220 55667", email: "nidhi.m@puneconsulting.com", city: "Pune", state: "Maharashtra" },
  { name: "AMITABH BHUYAN", phone: "+91 94350 77889", email: "abhuyan@assamtea.org", city: "Golaghat", state: "Assam" },
  { name: "DEEPAK PATEL", phone: "+91 98250 88990", email: "deepak.patel@gujaratchem.com", city: "Ahmedabad", state: "Gujarat" },
  { name: "POOJA CHETIA", phone: "+91 94352 33445", email: "pooja.chetia@gmail.com", city: "Sivasagar", state: "Assam" },
  { name: "MANISH TIWARI", phone: "+91 94150 66778", email: "m.tiwari@lucknowenterprises.com", city: "Lucknow", state: "Uttar Pradesh" },
  { name: "RIMA DUTTA", phone: "+91 98309 11223", email: "rima.dutta@heritagehotels.in", city: "Kolkata", state: "West Bengal" },
  { name: "GAURAV BANSAL", phone: "+91 98180 55443", email: "gaurav.bansal@gurgaonfin.com", city: "Gurugram", state: "Haryana" },
  { name: "PALLABI GOGOI", phone: "+91 94353 88990", email: "pallabi.gogoi@gauhatiuniv.ac.in", city: "Guwahati", state: "Assam" },
  { name: "SURESH MENON", phone: "+91 98450 77889", email: "suresh.menon@bengaluruit.com", city: "Bengaluru", state: "Karnataka" },
  { name: "SHALINI JAIN", phone: "+91 98260 22334", email: "shalini.jain@indoretech.com", city: "Indore", state: "Madhya Pradesh" },
  { name: "BIPUL BEZBARUAH", phone: "+91 98643 44556", email: "bipul.bez@assamforest.gov.in", city: "Kaziranga", state: "Assam" },
  { name: "HARPREET SINGH", phone: "+91 98140 66778", email: "hsingh@chandigarhagro.com", city: "Chandigarh", state: "Punjab" },
  { name: "SWATI MUKHERJEE", phone: "+91 98314 99887", email: "swati.m@bengaltourism.in", city: "Kolkata", state: "West Bengal" },
  { name: "DIPANKAR SAIKIA", phone: "+91 94354 11223", email: "dipankar.saikia@gmail.com", city: "Mangaldai", state: "Assam" },
  { name: "RAHUL DESHMUKH", phone: "+91 98230 44556", email: "rdeshmukh@nagpuroil.com", city: "Nagpur", state: "Maharashtra" },
  { name: "MADHUMITA BORAH", phone: "+91 94355 66778", email: "madhumita.b@gmail.com", city: "Nagaon", state: "Assam" },
  { name: "KUNAL KAPOOR", phone: "+91 98105 88990", email: "kkapoor@delhievents.com", city: "New Delhi", state: "Delhi" },
  { name: "ANJALI GOSWAMI", phone: "+91 98644 11223", email: "anjali.goswami@assamlaw.org", city: "Guwahati", state: "Assam" },
  { name: "VINOD CHOUHAN", phone: "+91 98292 33445", email: "vchouhan@udaipurpalace.in", city: "Udaipur", state: "Rajasthan" },
  { name: "JAHNU DEKA", phone: "+91 98645 55667", email: "jahnu.deka@gmail.com", city: "Barpeta", state: "Assam" },
  { name: "NEERAJ TRIPATHI", phone: "+91 94500 77889", email: "ntripathi@varanasiheritage.com", city: "Varanasi", state: "Uttar Pradesh" },
  { name: "TANYA MAZUMDAR", phone: "+91 98308 22334", email: "tanya.m@kolkatafmcg.com", city: "Kolkata", state: "West Bengal" },
  { name: "BHASKAR MEDHI", phone: "+91 94356 88990", email: "bhaskar.medhi@iitg.ac.in", city: "Guwahati", state: "Assam" },
  { name: "ASHOK AGRAWAL", phone: "+91 98270 11223", email: "ashok.agrawal@raipursteel.com", city: "Raipur", state: "Chhattisgarh" },
  { name: "RUNA DAS", phone: "+91 98646 33445", email: "runa.das@guwahatimedical.org", city: "Guwahati", state: "Assam" },
  { name: "SAMEER KHANNA", phone: "+91 98115 55667", email: "skhanna@noidatech.in", city: "Noida", state: "Uttar Pradesh" },
  { name: "DIPTI BORKAKOTY", phone: "+91 94357 77889", email: "dipti.borkakoty@gmail.com", city: "Golaghat", state: "Assam" },
  { name: "ARVIND IYER", phone: "+91 98400 99887", email: "arvind.iyer@chennaiauto.com", city: "Chennai", state: "Tamil Nadu" },
  { name: "BARASHA SARMAH", phone: "+91 98647 11223", email: "barasha.s@assamculture.gov.in", city: "Guwahati", state: "Assam" },
  { name: "TARUN JOSHI", phone: "+91 94120 33445", email: "tjoshi@dehradunedu.org", city: "Dehradun", state: "Uttarakhand" },
  { name: "MOHIT CHAUHAN", phone: "+91 98160 55667", email: "mchauhan@shimlaretreats.com", city: "Shimla", state: "Himachal Pradesh" },
  { name: "DIMPLE BAISHYA", phone: "+91 98648 77889", email: "dimple.baishya@gmail.com", city: "Nalbari", state: "Assam" },
  { name: "VIJAY KRISHNAN", phone: "+91 98410 88990", email: "vkrishnan@tidelpark.in", city: "Chennai", state: "Tamil Nadu" },
  { name: "GITIKA TAMULY", phone: "+91 94358 11223", email: "gitika.tamuly@gmail.com", city: "Dergaon", state: "Assam" },
  { name: "SANJAY AGGARWAL", phone: "+91 98108 33445", email: "saggarwal@delhitextiles.com", city: "Delhi", state: "Delhi" },
  { name: "NABANITA LAHKAR", phone: "+91 98649 55667", email: "n.lahkar@gmail.com", city: "Pathsala", state: "Assam" },
  { name: "SUNIL SHARMA", phone: "+91 98295 77889", email: "sunil.sharma@jodhpurmines.com", city: "Jodhpur", state: "Rajasthan" },
  { name: "BIDISHA HAZARIKA", phone: "+91 94359 99887", email: "bidisha.h@gmail.com", city: "Guwahati", state: "Assam" },
  { name: "VIVEK REDDY", phone: "+91 98490 11223", email: "vreddy@hyderabadpharma.in", city: "Hyderabad", state: "Telangana" },
  { name: "MONOJ BHARALI", phone: "+91 98650 33445", email: "monoj.bharali@nrl.co.in", city: "Numaligarh", state: "Assam" },
  { name: "ANUP AGARWAL", phone: "+91 98318 55667", email: "anup.a@kolkatajute.com", city: "Kolkata", state: "West Bengal" },
  { name: "TRISHNA KASHYAP", phone: "+91 98651 77889", email: "trishna.k@gmail.com", city: "Guwahati", state: "Assam" },
  { name: "ROHIT MALHOTRA", phone: "+91 98118 99887", email: "rmalhotra@gurgaonhospitality.com", city: "Gurugram", state: "Haryana" },
  { name: "KAMAL BARUAH", phone: "+91 94360 11223", email: "kamal.baruah@gmail.com", city: "North Lakhimpur", state: "Assam" },
  { name: "PRAVEEN HEGDE", phone: "+91 98455 33445", email: "phegde@mangaloreports.com", city: "Mangaluru", state: "Karnataka" },
  { name: "JURI GOGOI", phone: "+91 94361 55667", email: "juri.gogoi@assamtea.in", city: "Sonari", state: "Assam" },
  { name: "RAJEEV SRIVASTAVA", phone: "+91 94155 77889", email: "rsrivastava@kanpurind.com", city: "Kanpur", state: "Uttar Pradesh" },
  { name: "CHINMOY BORUAH", phone: "+91 98652 99887", email: "chinmoy.b@gmail.com", city: "Tinsukia", state: "Assam" },
];

const FUTURE_RESERVATION_NAMES = [
  { name: "DR. SIDDHARTH KAUSHIK", phone: "+91 98109 11223", city: "New Delhi", state: "Delhi" },
  { name: "MEENAKSHI SUNDARAM", phone: "+91 98409 22334", city: "Chennai", state: "Tamil Nadu" },
  { name: "HIMANSHU SEKHAR DAS", phone: "+91 94350 99887", city: "Bhubaneswar", state: "Odisha" },
  { name: "SHIVANI CHOUDHARY", phone: "+91 98299 33445", city: "Jaipur", state: "Rajasthan" },
  { name: "PARTHA PRATIM NEOG", phone: "+91 98640 77665", city: "Guwahati", state: "Assam" },
  { name: "AMIT KHURANA", phone: "+91 98119 55667", city: "Chandigarh", state: "Punjab" },
  { name: "DEVIKA CHATTERJEE", phone: "+91 98319 77889", city: "Kolkata", state: "West Bengal" },
  { name: "NILUTPAL SARMAH", phone: "+91 94351 88990", city: "Jorhat", state: "Assam" },
  { name: "ABHISHEK JOSHI", phone: "+91 98229 11223", city: "Pune", state: "Maharashtra" },
  { name: "MOUSHUMI BARUA", phone: "+91 98641 44556", email: "moushumi.b@gmail.com", city: "Dibrugarh", state: "Assam" },
  { name: "ROOPESH GUPTA", phone: "+91 98269 66778", city: "Indore", state: "Madhya Pradesh" },
  { name: "PRANATI TALUKDAR", phone: "+91 94352 99887", city: "Guwahati", state: "Assam" },
  { name: "KISHORE KUMAR REDDY", phone: "+91 98499 11223", city: "Hyderabad", state: "Telangana" },
  { name: "RASHMI BORAH", phone: "+91 98642 33445", city: "Tezpur", state: "Assam" },
  { name: "MANAV SHARMA", phone: "+91 98189 55667", city: "Noida", state: "Uttar Pradesh" },
  { name: "UTPAL BHUYAN", phone: "+91 94353 77889", city: "Nagaon", state: "Assam" },
  { name: "ANIRUDDHA SEN", phone: "+91 98309 88990", city: "Kolkata", state: "West Bengal" },
  { name: "GITANJALI DEVI", phone: "+91 98643 11223", city: "Guwahati", state: "Assam" },
  { name: "RAJAT BANSAL", phone: "+91 98149 33445", city: "Ludhiana", state: "Punjab" },
  { name: "DIPANWITA ROY", phone: "+91 94354 55667", city: "Silchar", state: "Assam" },
];

async function seedClean80Occupancy() {
  console.log("🧹 Starting Clean-Up & 80% Occupancy Seeding...");

  // 1. Clean up operational data in proper dependency order
  console.log("   - Cleaning existing orders, folios, stays, and reservations...");
  await prisma.pOSBill.deleteMany({});
  await prisma.kOTLine.deleteMany({});
  await prisma.kOT.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.paymentAllocation.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.deposit.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.creditNoteLine.deleteMany({});
  await prisma.creditNote.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.folioEntry.deleteMany({});
  await prisma.folioWindow.deleteMany({});
  await prisma.folio.deleteMany({});
  await prisma.roomAssignment.deleteMany({});
  await prisma.stayGuest.deleteMany({});
  await prisma.stay.deleteMany({});
  await prisma.reservationNight.deleteMany({});
  await prisma.reservationNote.deleteMany({});
  await prisma.reservationRoom.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.guestRegistration.deleteMany({});
  await prisma.guestDocument.deleteMany({});
  await prisma.guest.deleteMany({});
  await prisma.hKTaskEvent.deleteMany({});
  await prisma.housekeepingTask.deleteMany({});

  // 2. Fetch properties
  const divine = await prisma.property.findFirst({
    where: { code: { in: ["HDW", "HDV-01"] } },
    include: { rooms: { include: { roomType: true } } },
  });

  const ambarish = await prisma.property.findFirst({
    where: { code: "GUW-01" },
    include: { rooms: { include: { roomType: true } } },
  });

  if (!divine || !ambarish) {
    throw new Error("Missing Hotel Divine View or Hotel Ambarish in database!");
  }

  console.log(`\n🏢 Found Properties:`);
  console.log(`   - Hotel Divine View (${divine.code}): ${divine.rooms.length} Total Rooms`);
  console.log(`   - Hotel Ambarish Grand Residency (${ambarish.code}): ${ambarish.rooms.length} Total Rooms`);

  const propertiesToSeed = [
    {
      prop: divine,
      propCode: "HDV",
      targetOccupiedCount: 62, // 62 / 77 = 80.5%
      futureResCount: 20,
    },
    {
      prop: ambarish,
      propCode: "AMB",
      targetOccupiedCount: 38, // 38 / 48 = 79.2%
      futureResCount: 15,
    },
  ];

  let guestIdx = 0;

  for (const { prop, propCode, targetOccupiedCount, futureResCount } of propertiesToSeed) {
    console.log(`\n🏨 Processing ${prop.displayName} (${propCode})...`);

    // Reset document sequence counters
    const docTypes = ["GRC", "FOL", "INV", "ORD", "KOT", "REC", "RES"];
    for (const dt of docTypes) {
      await prisma.documentSequence.upsert({
        where: {
          propertyId_documentType_scopeKey_financialYear: {
            propertyId: prop.id,
            documentType: dt,
            scopeKey: "PROPERTY",
            financialYear: "2026-2027",
          },
        },
        update: { nextValue: 101 },
        create: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          documentType: dt,
          scopeKey: "PROPERTY",
          financialYear: "2026-2027",
          prefix: `${dt}-${propCode}-2627-`,
          nextValue: 101,
          padding: 4,
        },
      });
    }

    const rooms = prop.rooms;
    const occupiedRooms = rooms.slice(0, targetOccupiedCount);
    const vacantRooms = rooms.slice(targetOccupiedCount);

    console.log(`   - Populating ${occupiedRooms.length} Occupied Rooms (~80%) and ${vacantRooms.length} Vacant Rooms`);

    // A. POPULATE IN-HOUSE OCCUPIED ROOMS
    let occCount = 0;
    for (const room of occupiedRooms) {
      occCount++;
      const guestSeed = INDIAN_GUEST_NAMES[guestIdx % INDIAN_GUEST_NAMES.length];
      guestIdx++;

      // 1. Create Guest
      const guest = await prisma.guest.create({
        data: {
          organizationId: prop.organizationId,
          name: guestSeed.name,
          phone: guestSeed.phone,
          email: guestSeed.email,
          nationality: "Indian",
          addressJson: JSON.stringify({
            street: "MG Road",
            city: guestSeed.city,
            state: guestSeed.state,
            postalCode: "781001",
            country: "India",
          }),
        },
      });

      // 2. Stay dates (checked in 1 or 2 days ago, checking out in 1-3 days)
      const stayDaysAgo = occCount % 3 === 0 ? 2 : occCount % 2 === 0 ? 1 : 0;
      const stayDurationDays = 2 + (occCount % 3);

      const arrivalDate = new Date();
      arrivalDate.setDate(arrivalDate.getDate() - stayDaysAgo);
      arrivalDate.setHours(13, 0, 0, 0);

      const departureDate = new Date(arrivalDate);
      departureDate.setDate(departureDate.getDate() + stayDurationDays);
      departureDate.setHours(11, 0, 0, 0);

      // 3. Create Stay
      const stay = await prisma.stay.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          primaryGuestId: guest.id,
          status: "IN_HOUSE",
          arrivalAt: arrivalDate,
          expectedDepartureAt: departureDate,
          adults: 1 + (occCount % 2),
          children: occCount % 4 === 0 ? 1 : 0,
        },
      });

      // 4. Create Room Assignment
      await prisma.roomAssignment.create({
        data: {
          stayId: stay.id,
          roomId: room.id,
          startsAt: arrivalDate,
          endsAt: null,
          rateHandling: "RETAIN_RATE",
        },
      });

      // 5. Create Folio & Window 1
      const folio = await prisma.folio.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          stayId: stay.id,
          status: "OPEN",
          currency: "INR",
          openedAt: arrivalDate,
          balance: 0,
        },
      });

      await prisma.stay.update({
        where: { id: stay.id },
        data: { folioId: folio.id },
      });

      const folioWindow = await prisma.folioWindow.create({
        data: {
          folioId: folio.id,
          name: "Guest Window",
          windowNumber: 1,
          payerType: "GUEST",
          guestOrCompanySnapshot: JSON.stringify({
            name: guest.name,
            phone: guest.phone,
            city: guestSeed.city,
          }),
          status: "OPEN",
        },
      });

      // 6. Post Room Tariff Charges (for elapsed nights)
      const baseNightRate =
        room.roomType?.code === "EXEC"
          ? 3800
          : room.roomType?.code === "SUITE"
          ? 5500
          : room.roomType?.code === "DELUXE"
          ? 2800
          : 2200;

      let totalCharges = 0;
      const nightsBilled = stayDaysAgo + 1; // at least 1 night posted

      for (let n = 0; n < nightsBilled; n++) {
        const nightDate = new Date(arrivalDate);
        nightDate.setDate(nightDate.getDate() + n);
        const dateStr = nightDate.toISOString().slice(0, 10);

        const gstRate = baseNightRate > 7500 ? 18 : 12;
        const cgstRate = gstRate / 2;
        const sgstRate = gstRate / 2;
        const cgstAmount = Math.round(((baseNightRate * cgstRate) / 100) * 100) / 100;
        const sgstAmount = Math.round(((baseNightRate * sgstRate) / 100) * 100) / 100;
        const nightTotal = baseNightRate + cgstAmount + sgstAmount;

        totalCharges += nightTotal;

        await prisma.folioEntry.create({
          data: {
            organizationId: prop.organizationId,
            propertyId: prop.id,
            folioId: folio.id,
            folioWindowId: folioWindow.id,
            serviceDate: dateStr,
            type: "CHARGE",
            chargeCode: "ROOM_TARIFF",
            description: `Room Tariff - Room ${room.number} (${room.roomType?.name || "Standard"})`,
            qty: 1,
            unitAmount: baseNightRate,
            taxableAmount: baseNightRate,
            taxComponentsJson: JSON.stringify({
              sac: "996311",
              cgstRate,
              cgstAmount,
              sgstRate,
              sgstAmount,
              igstRate: 0,
              igstAmount: 0,
            }),
            totalAmount: nightTotal,
            sourceType: "PMS_NIGHTLY_CHARGE",
            status: "POSTED",
          },
        });
      }

      // 7. Add F&B dining charges for ~50% of stays
      if (occCount % 2 === 0) {
        const foodItems = [
          { name: "Executive Breakfast Buffet", price: 350 },
          { name: "Assamese Special Lunch Thali", price: 480 },
          { name: "Butter Chicken & Garlic Naan Dinner", price: 540 },
          { name: "Paneer Butter Masala & Roti Combo", price: 380 },
        ];
        const food = foodItems[occCount % foodItems.length];
        const foodTax = Math.round(food.price * 0.05 * 100) / 100;
        const foodTotal = food.price + foodTax;
        totalCharges += foodTotal;

        await prisma.folioEntry.create({
          data: {
            organizationId: prop.organizationId,
            propertyId: prop.id,
            folioId: folio.id,
            folioWindowId: folioWindow.id,
            serviceDate: new Date().toISOString().slice(0, 10),
            type: "CHARGE",
            chargeCode: "RESTAURANT_FOOD",
            description: `Ambarish Restaurant Dining - ${food.name}`,
            qty: 1,
            unitAmount: food.price,
            taxableAmount: food.price,
            taxComponentsJson: JSON.stringify({
              sac: "996331",
              cgstRate: 2.5,
              cgstAmount: foodTax / 2,
              sgstRate: 2.5,
              sgstAmount: foodTax / 2,
              igstRate: 0,
              igstAmount: 0,
            }),
            totalAmount: foodTotal,
            sourceType: "POS_ORDER",
            status: "POSTED",
          },
        });
      }

      // 8. Record Advance Payment for ~60% of stays
      let totalPayments = 0;
      if (occCount % 5 !== 0) {
        const advanceAmount = Math.min(Math.round(totalCharges * 0.75), 5000);
        totalPayments += advanceAmount;

        const pMethods = ["UPI", "CARD", "CASH"];
        const pMethod = pMethods[occCount % pMethods.length];

        await prisma.payment.create({
          data: {
            organizationId: prop.organizationId,
            propertyId: prop.id,
            receiptNo: `REC-${propCode}-2627-${String(occCount + 100).padStart(4, "0")}`,
            folio: { connect: { id: folio.id } },
            amount: advanceAmount,
            method: pMethod,
            reference: pMethod === "UPI" ? `UPI/UTR/${Date.now().toString().slice(-8)}` : "AUTH-99482",
            payerSnapshot: JSON.stringify({ name: guest.name, phone: guest.phone }),
            status: "SUCCEEDED",
          },
        });
      }

      // Update Folio Balance
      await prisma.folio.update({
        where: { id: folio.id },
        data: { balance: Math.round((totalCharges - totalPayments) * 100) / 100 },
      });

      // 9. Update Room State: OCCUPIED (mostly CLEAN, some DIRTY for HK testing)
      const isDirty = occCount % 7 === 0;
      await prisma.roomState.upsert({
        where: { roomId: room.id },
        update: {
          occupancyStatus: "OCCUPIED",
          housekeepingStatus: isDirty ? "DIRTY" : "CLEAN",
          sellabilityStatus: "SELLABLE",
        },
        create: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          roomId: room.id,
          occupancyStatus: "OCCUPIED",
          housekeepingStatus: isDirty ? "DIRTY" : "CLEAN",
          sellabilityStatus: "SELLABLE",
        },
      });

      // If dirty, create Housekeeping Task
      if (isDirty) {
        await prisma.housekeepingTask.create({
          data: {
            organizationId: prop.organizationId,
            propertyId: prop.id,
            roomId: room.id,
            stayId: stay.id,
            type: "STAYOVER_SERVICE",
            priority: "NORMAL",
            status: "OPEN",
            notes: "Daily stayover cleaning & towel replenishment requested",
          },
        });
      }
    }

    // B. POPULATE VACANT ROOMS
    let vacCount = 0;
    for (const room of vacantRooms) {
      vacCount++;
      const isDirty = vacCount % 3 === 0;
      await prisma.roomState.upsert({
        where: { roomId: room.id },
        update: {
          occupancyStatus: "VACANT",
          housekeepingStatus: isDirty ? "DIRTY" : "CLEAN",
          sellabilityStatus: "SELLABLE",
        },
        create: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          roomId: room.id,
          occupancyStatus: "VACANT",
          housekeepingStatus: isDirty ? "DIRTY" : "CLEAN",
          sellabilityStatus: "SELLABLE",
        },
      });

      if (isDirty) {
        await prisma.housekeepingTask.create({
          data: {
            organizationId: prop.organizationId,
            propertyId: prop.id,
            roomId: room.id,
            type: "CHECKOUT_CLEAN",
            priority: "HIGH",
            status: "OPEN",
            notes: "Post check-out full sanitization & linen change",
          },
        });
      }
    }

    // C. POPULATE FUTURE RESERVATIONS
    console.log(`   - Creating ${futureResCount} Future Reservations for ${prop.displayName}...`);
    for (let rIdx = 0; rIdx < futureResCount; rIdx++) {
      const fGuest = FUTURE_RESERVATION_NAMES[rIdx % FUTURE_RESERVATION_NAMES.length];
      const g = await prisma.guest.create({
        data: {
          organizationId: prop.organizationId,
          name: fGuest.name,
          phone: fGuest.phone,
          nationality: "Indian",
          addressJson: JSON.stringify({ city: fGuest.city, state: fGuest.state, country: "India" }),
        },
      });

      const daysInFuture = 1 + (rIdx % 10);
      const arrD = new Date();
      arrD.setDate(arrD.getDate() + daysInFuture);
      const depD = new Date(arrD);
      depD.setDate(depD.getDate() + 2 + (rIdx % 3));

      const arrStr = arrD.toISOString().slice(0, 10);
      const depStr = depD.toISOString().slice(0, 10);

      const targetRoom = vacantRooms[rIdx % vacantRooms.length] || rooms[0];
      const roomType = targetRoom.roomType;

      const res = await prisma.reservation.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          confirmationNo: `RES-${propCode}-2627-${String(rIdx + 101).padStart(4, "0")}`,
          primaryGuestId: g.id,
          arrivalDate: arrStr,
          departureDate: depStr,
          status: "CONFIRMED",
          source: rIdx % 3 === 0 ? "OTA" : rIdx % 2 === 0 ? "DIRECT" : "PHONE",
          guaranteeType: "ADVANCE_DEPOSIT",
          totalSnapshot: 5600,
        },
      });

      const resRoom = await prisma.reservationRoom.create({
        data: {
          reservationId: res.id,
          roomTypeId: roomType?.id || targetRoom.roomTypeId,
          assignedRoomId: rIdx % 2 === 0 ? targetRoom.id : null,
          adults: 2,
          children: 0,
          status: "CONFIRMED",
        },
      });

      await prisma.reservationNight.create({
        data: {
          reservationRoomId: resRoom.id,
          serviceDate: arrStr,
          baseAmount: 2500,
          taxableAmount: 2500,
          taxAmount: 300,
          totalAmount: 2800,
        },
      });
    }

    // D. POPULATE PENDING SELF-CHECK-IN KIOSK QUEUE
    console.log(`   - Adding 3 Pending Kiosk Check-In GRC records for ${prop.displayName}...`);
    const kioskGuests = [
      { name: "PALLAV SHARMA", phone: "+91 98640 12890", city: "Guwahati", age: 34 },
      { name: "SIMRAN KAUR", phone: "+91 98140 33211", city: "Amritsar", age: 29 },
      { name: "DIPANKAR GOHAIN", phone: "+91 94350 44556", city: "Sibsagar", age: 42 },
    ];

    for (let k = 0; k < kioskGuests.length; k++) {
      const kg = kioskGuests[k];
      const vacantSample = vacantRooms[k]?.number || null;
      await prisma.guestRegistration.create({
        data: {
          organizationId: prop.organizationId,
          propertyId: prop.id,
          registrationNo: `GRC-${propCode}-2627-${String(k + 101).padStart(4, "0")}`,
          status: "PENDING_REVIEW",
          fullName: kg.name,
          age: kg.age,
          gender: k === 1 ? "Female" : "Male",
          nationality: "Indian",
          arrivalDateTime: new Date().toISOString().replace("T", " ").slice(0, 16),
          preAssignedRoom: vacantSample,
          streetAddress: "Station Road",
          city: kg.city,
          state: "Assam",
          pinZipCode: "781001",
          mobilePhone: kg.phone,
          purposeOfVisit: "Business / Work",
          idDocumentType: "AADHAAR",
          idDocumentNumber: `XXXX-XXXX-${String(1000 + k)}`,
          termsAccepted: true,
        },
      });
    }
  }

  console.log("\n🎉 Database Clean-Up & 80% Occupancy Seeding Completed Successfully!");
}

seedClean80Occupancy()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Seeding failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
