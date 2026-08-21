import { prisma } from "../db/prisma";

export async function populateAmbarishMenu() {
  console.log("🍽️ Populating Hotel Ambarish Grand Residency Menu...");

  const properties = await prisma.property.findMany({
    include: {
      outlets: {
        include: {
          categories: {
            include: {
              items: {
                include: {
                  variants: true,
                },
              },
            },
          },
        },
      },
    },
  });

  for (const property of properties) {
    // Update property branding if needed
    await prisma.property.update({
      where: { id: property.id },
      data: {
        displayName: property.code === "GUW-01" ? "Hotel Ambarish Grand Residency" : property.displayName,
        address: property.code === "GUW-01" ? "M.D. Shah Road, Paltan Bazar, Near Assam Finance Corporation, Guwahati - 781008, Assam" : property.address,
        phone: property.code === "GUW-01" ? "+91 69017 41211" : property.phone,
        email: property.code === "GUW-01" ? "reservation.ambarish@gmail.com" : property.email,
      },
    });

    let outlet = property.outlets[0];
    if (!outlet) {
      outlet = await prisma.outlet.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          code: "REST-01",
          name: "Ambarish Restaurant & Room Dining",
          type: "RESTAURANT",
        },
        include: { categories: { include: { items: { include: { variants: true } } } } },
      });
    } else {
      await prisma.outlet.update({
        where: { id: outlet.id },
        data: { name: "Ambarish Restaurant & Room Dining" },
      });
    }

    // Clean existing items in this outlet to replace with exact official menu
    for (const cat of outlet.categories) {
      for (const item of cat.items) {
        await prisma.menuItemVariant.deleteMany({ where: { menuItemId: item.id } });
        await prisma.menuItem.delete({ where: { id: item.id } });
      }
      await prisma.menuCategory.delete({ where: { id: cat.id } });
    }

    // Define All Categories & Items from the Official Menu
    const menuData = [
      // 1. BREAKFAST (Timing: 08:00 - 11:00)
      {
        category: "Breakfast Specials",
        servicePeriod: "BREAKFAST",
        availableFrom: "08:00",
        availableUntil: "11:00",
        sortOrder: 1,
        items: [
          { code: "BF-01", name: "BREAD TOAST", price: 50, isVeg: true, portion: "2 Pcs", desc: "Crispy golden toasted bread slices" },
          { code: "BF-02", name: "PLAIN BREAD WITH BUTTER / JAM", price: 50, isVeg: true, portion: "2 Pcs", desc: "Fresh bread served with butter and fruit jam" },
          { code: "BF-03", name: "BREAD OMELET", price: 80, isVeg: false, portion: "1 Portion", desc: "Fluffy double-egg omelet served between toasted bread slices" },
          { code: "BF-04", name: "FRENCH TOAST", price: 110, isVeg: false, portion: "2 Pcs", desc: "Classic golden fried egg-dipped French toast" },
          { code: "BF-05", name: "3PC PURI SABJI", price: 80, isVeg: true, portion: "3 Pcs", desc: "Hot fluffy puris served with spicy potato curry" },
          { code: "BF-06", name: "2PC ROTI SABJI", price: 80, isVeg: true, portion: "2 Pcs", desc: "Homestyle wheat rotis served with fresh seasonal sabji" },
          { code: "BF-07", name: "2PC PLAIN PARATHA WITH SABJEE", price: 100, isVeg: true, portion: "2 Pcs", desc: "Layered tawa parathas served with aromatic sabji" },
          { code: "BF-08", name: "CHOLE BHATORE", price: 90, isVeg: true, portion: "2 Pcs", desc: "Authentic North Indian spiced chole with fluffy bhaturas" },
          { code: "BF-09", name: "TAWA ROTI", price: 20, isVeg: true, portion: "1 Pc", desc: "Fresh handmade whole-wheat tawa roti" },
          { code: "BF-10", name: "BUTTER ROTI", price: 30, isVeg: true, portion: "1 Pc", desc: "Tawa roti brushed with rich dairy butter" },
          { code: "BF-11", name: "PLAIN PARATHA (1Pc)", price: 40, isVeg: true, portion: "1 Pc", desc: "Crisp tawa paratha" },
          { code: "BF-12", name: "ALOO PARATHA (1Pc)", price: 70, isVeg: true, portion: "1 Pc", desc: "Stuffed spiced potato paratha served with pickle" },
          { code: "BF-13", name: "ONION PARATHA (1Pc)", price: 70, isVeg: true, portion: "1 Pc", desc: "Crisp paratha stuffed with seasoned onions & herbs" },
          { code: "BF-14", name: "PANEER PARATHA (1Pc)", price: 120, isVeg: true, portion: "1 Pc", desc: "Rich stuffed cottage cheese paratha" },
          { code: "BF-15", name: "EXTRA SABJI", price: 60, isVeg: true, portion: "1 Cup", desc: "Extra portion of homestyle breakfast sabji" },
          { code: "BF-16", name: "BOIL EGG (2 PCS)", price: 50, isVeg: false, portion: "2 Pcs", desc: "Fresh boiled farm eggs seasoned with pepper & salt" },
          { code: "BF-17", name: "MASALA/PLAIN OMELETTE", price: 70, isVeg: false, portion: "1 Portion", desc: "Omelette prepared with onions, green chillies & coriander" },
          { code: "BF-18", name: "EGG BHURJI", price: 120, isVeg: false, portion: "1 Portion", desc: "Spiced Indian scrambled eggs with onions and tomatoes" },
        ],
      },

      // 2. HOT BEVERAGES (Available All Day)
      {
        category: "Hot Beverages",
        servicePeriod: "ALL_DAY",
        availableFrom: "08:00",
        availableUntil: "22:45",
        sortOrder: 2,
        items: [
          { code: "BEV-01", name: "MILK TEA", price: 40, isVeg: true, portion: "1 Cup", desc: "Assam CTC brewed milk tea with aromatic spices" },
          { code: "BEV-02", name: "BLACK TEA", price: 30, isVeg: true, portion: "1 Cup", desc: "Pure Assam orthodox black tea liquor" },
          { code: "BEV-03", name: "BLACK COFFEE", price: 50, isVeg: true, portion: "1 Cup", desc: "Freshly brewed hot black coffee" },
          { code: "BEV-04", name: "MILK COFFEE", price: 60, isVeg: true, portion: "1 Cup", desc: "Creamy aromatic hot milk coffee" },
          { code: "BEV-05", name: "HOT MILK", price: 80, isVeg: true, portion: "1 Glass", desc: "Pure steamed sweetened hot dairy milk" },
        ],
      },

      // 3. SNACKS (À La Carte: 12:00 NOON - 10:45 PM)
      {
        category: "Evening Snacks & Pakodas",
        servicePeriod: "A_LA_CARTE",
        availableFrom: "12:00",
        availableUntil: "22:45",
        sortOrder: 3,
        items: [
          { code: "SNK-01", name: "FRENCH FRIES", price: 150, isVeg: true, portion: "1 Plate", desc: "Crispy salted potato fries served with ketchup" },
          { code: "SNK-02", name: "PEANUT MASALA", price: 120, isVeg: true, portion: "1 Plate", desc: "Crunchy roasted peanuts tossed with onions, tomatoes & chaat masala" },
          { code: "SNK-03", name: "VEGETABLE PAKODA", price: 150, isVeg: true, portion: "1 Plate", desc: "Mixed vegetable fritters fried in spiced gram flour batter" },
          { code: "SNK-04", name: "ONION RING PAKODA", price: 160, isVeg: true, portion: "1 Plate", desc: "Crispy golden fried spiced onion ring fritters" },
          { code: "SNK-05", name: "EGG PAKODA (6PC)", price: 180, isVeg: false, portion: "6 Pcs", desc: "Boiled egg halves coated in spiced batter and deep-fried" },
          { code: "SNK-06", name: "PANEER PAKODA", price: 220, isVeg: true, portion: "1 Plate", desc: "Fresh cottage cheese fritters seasoned with chaat masala" },
          { code: "SNK-07", name: "CHICKEN PAKODA", price: 220, isVeg: false, portion: "1 Plate", desc: "Tender boneless chicken morsels spiced and deep-fried crisp" },
        ],
      },

      // 4. CHINESE STARTERS & MAIN COURSE (12:00 NOON - 10:45 PM)
      {
        category: "Chinese Starters & Mains",
        servicePeriod: "A_LA_CARTE",
        availableFrom: "12:00",
        availableUntil: "22:45",
        sortOrder: 4,
        items: [
          { code: "CHN-01", name: "AMERICAN CORN SALT PEPPER", price: 250, isVeg: true, portion: "1 Plate", desc: "Crispy sweet corn kernels tossed with peppers and scallions" },
          { code: "CHN-02", name: "CRISPY CHILLY BABY CORN", price: 250, isVeg: true, portion: "1 Plate", desc: "Crunchy baby corn tossed with hot green chillies and soy" },
          { code: "CHN-03", name: "CHILLY PANEER (DRY/GRAVY)", price: 250, isVeg: true, portion: "1 Plate", desc: "Cubes of paneer tossed in spicy Indo-Chinese chilli soy sauce" },
          { code: "CHN-04", name: "VEG. MANCHURIAN (DRY/GRAVY) 8PC", price: 250, isVeg: true, portion: "8 Pcs", desc: "Minced vegetable dumplings in classic tangy Manchurian gravy" },
          { code: "CHN-05", name: "CRISPY CHICKEN DRY", price: 300, isVeg: false, portion: "1 Plate", desc: "Shredded chicken fried extra crisp and tossed with oriental spices" },
          { code: "CHN-06", name: "CHILLY CHICKEN (DRY/GRAVY) 8PC", price: 250, isVeg: false, portion: "8 Pcs", desc: "Succulent chicken chunks tossed with capsicum, onion and chillies" },
          { code: "CHN-07", name: "CHICKEN 65 DRY", price: 250, isVeg: false, portion: "1 Plate", desc: "South-Indian style spicy curry-leaf tempered chicken fry" },
          { code: "CHN-08", name: "CHICKEN MANCHURIAN (DRY/GRAVY) 8PC", price: 250, isVeg: false, portion: "8 Pcs", desc: "Chicken meatballs simmered in ginger-garlic Manchurian sauce" },
          { code: "CHN-09", name: "CHICKEN IN HOT GARLIC SAUCE (DRY/GRAVY) 8PC", price: 250, isVeg: false, portion: "8 Pcs", desc: "Chicken cooked in fiery red hot garlic pepper sauce" },
          { code: "CHN-10", name: "GARLIC CHICKEN (GRAVY) 8PC", price: 150, isVeg: false, portion: "8 Pcs", desc: "Chicken chunks in rich roasted garlic savory gravy" },
          { code: "CHN-11", name: "VEG. HAKKA NOODLES", price: 180, isVeg: true, portion: "1 Plate", desc: "Wok-tossed noodles with shredded cabbage, carrot & bell peppers" },
          { code: "CHN-12", name: "EGG HAKKA NOODLES", price: 180, isVeg: false, portion: "1 Plate", desc: "Wok-tossed noodles with scrambled egg and crisp vegetables" },
          { code: "CHN-13", name: "CHICKEN HAKKA NOODLES", price: 200, isVeg: false, portion: "1 Plate", desc: "Classic hakka noodles tossed with tender chicken strips" },
          { code: "CHN-14", name: "VEGETABLE FRIED RICE", price: 150, isVeg: true, portion: "1 Plate", desc: "Fragrant rice stir-fried with garden vegetables" },
          { code: "CHN-15", name: "EGG FRIED RICE", price: 180, isVeg: false, portion: "1 Plate", desc: "Aromatic wok-fried rice with scrambled eggs" },
          { code: "CHN-16", name: "CHICKEN FRIED RICE", price: 200, isVeg: false, portion: "1 Plate", desc: "Wok fried long-grain rice with diced chicken and scallions" },
          { code: "CHN-17", name: "VEGETABLE GRAVY NOODLES", price: 200, isVeg: true, portion: "1 Plate", desc: "Crispy noodles topped with exotic vegetables in thick Cantonese sauce" },
          { code: "CHN-18", name: "CHICKEN GRAVY NOODLES", price: 230, isVeg: false, portion: "1 Plate", desc: "Noodles smothered with seasoned chicken and vegetables in gravy" },
        ],
      },

      // 5. PAPAD, SALAD & RAITA (12:00 NOON - 10:45 PM)
      {
        category: "Papad, Salad & Raita",
        servicePeriod: "A_LA_CARTE",
        availableFrom: "12:00",
        availableUntil: "22:45",
        sortOrder: 5,
        items: [
          { code: "SLD-01", name: "PAPAD BHURJI", price: 80, isVeg: true, portion: "1 Plate", desc: "Crushed roasted papad tempered with onions, tomatoes & spice" },
          { code: "SLD-02", name: "ROASTED / FRY PAPAD (2PC)", price: 50, isVeg: true, portion: "2 Pcs", desc: "Crispy roasted or deep fried lentil papad" },
          { code: "SLD-03", name: "GREEN SALAD", price: 100, isVeg: true, portion: "1 Plate", desc: "Freshly sliced cucumber, tomato, carrot, onion & lemon" },
          { code: "SLD-04", name: "KUCHUMBER SALAD", price: 100, isVeg: true, portion: "1 Plate", desc: "Diced crunchy vegetables seasoned with herbs and lemon juice" },
          { code: "SLD-05", name: "ONION SALAD", price: 100, isVeg: true, portion: "1 Plate", desc: "Crisp sliced red onion rings with green chillies & lemon" },
          { code: "SLD-06", name: "PLAIN RAITA", price: 70, isVeg: true, portion: "1 Bowl", desc: "Chilled whisked yogurt seasoned with roasted cumin" },
          { code: "SLD-07", name: "MIX RAITA", price: 90, isVeg: true, portion: "1 Bowl", desc: "Yogurt blended with diced cucumbers, tomatoes and herbs" },
        ],
      },

      // 6. MAIN COURSE VEGETARIAN (12:00 NOON - 10:45 PM)
      {
        category: "Main Course (Vegetarian)",
        servicePeriod: "A_LA_CARTE",
        availableFrom: "12:00",
        availableUntil: "22:45",
        sortOrder: 6,
        items: [
          { code: "MCV-01", name: "ALOO DUM", price: 170, isVeg: true, portion: "1 Bowl", desc: "Baby potatoes slow cooked in rich spiced tomato-onion gravy" },
          { code: "MCV-02", name: "ALOO MATAR", price: 180, isVeg: true, portion: "1 Bowl", desc: "Fresh green peas and potatoes in a spiced homestyle curry" },
          { code: "MCV-03", name: "BOIL VEGETABLE", price: 150, isVeg: true, portion: "1 Bowl", desc: "Steamed healthy garden vegetables tossed lightly in butter" },
          { code: "MCV-04", name: "ALOO JEERA", price: 90, isVeg: true, portion: "1 Bowl", desc: "Dry diced potatoes sautéed with cumin seeds & turmeric" },
          { code: "MCV-05", name: "ALOO BHAJI", price: 90, isVeg: true, portion: "1 Bowl", desc: "Assamese homestyle crispy potato fry" },
          { code: "MCV-06", name: "ALOO PITIKA", price: 80, isVeg: true, portion: "1 Bowl", desc: "Signature Assamese mashed potato with mustard oil, onion & green chillies" },
          { code: "MCV-07", name: "PANEER BUTTER MASALA", price: 250, isVeg: true, portion: "1 Bowl", desc: "Cottage cheese cubes simmered in velvety butter tomato makhani gravy" },
          { code: "MCV-08", name: "PANEER DO PYAZA", price: 250, isVeg: true, portion: "1 Bowl", desc: "Paneer cooked with double the onions in a rich aromatic gravy" },
          { code: "MCV-09", name: "KADAI PANEER", price: 250, isVeg: true, portion: "1 Bowl", desc: "Paneer with bell peppers cooked in freshly ground kadai masala" },
          { code: "MCV-10", name: "PALAK PANEER (SEASONAL)", price: 250, isVeg: true, portion: "1 Bowl", desc: "Fresh spinach puree with soft paneer cubes" },
          { code: "MCV-11", name: "PANEER NAKMA", price: 300, isVeg: true, portion: "1 Bowl", desc: "Chef's special paneer delicacy with rich dry fruit and cashew nut gravy" },
          { code: "MCV-12", name: "PLAIN DAL", price: 120, isVeg: true, portion: "1 Bowl", desc: "Homestyle yellow lentil soup tempered with cumin" },
          { code: "MCV-13", name: "PILI DAL FRY", price: 150, isVeg: true, portion: "1 Bowl", desc: "Yellow lentils fried with onions, garlic, tomatoes & ghee" },
          { code: "MCV-14", name: "PILI DAL TADKA", price: 150, isVeg: true, portion: "1 Bowl", desc: "Creamy lentils infused with a smoky garlic, cumin and red chilli tadka" },
        ],
      },

      // 7. MAIN COURSE NON-VEGETARIAN (12:00 NOON - 10:45 PM)
      {
        category: "Main Course (Non-Vegetarian)",
        servicePeriod: "A_LA_CARTE",
        availableFrom: "12:00",
        availableUntil: "22:45",
        sortOrder: 7,
        items: [
          { code: "MCN-01", name: "CHICKEN BUTTER MASALA", price: 250, isVeg: false, portion: "1 Bowl", desc: "Tender chicken pieces simmered in rich creamy tomato butter gravy" },
          { code: "MCN-02", name: "CHICKEN BHARTA", price: 280, isVeg: false, portion: "1 Bowl", desc: "Shredded chicken cooked in a rich, velvety egg-enriched gravy" },
          { code: "MCN-03", name: "KADAI CHICKEN", price: 280, isVeg: false, portion: "1 Bowl", desc: "Chicken tossed with bell peppers and roasted kadai coriander-cumin masala" },
          { code: "MCN-04", name: "CHICKEN MASALA", price: 230, isVeg: false, portion: "1 Bowl", desc: "Traditional spicy North Indian chicken curry" },
          { code: "MCN-05", name: "CHICKEN CURRY", price: 230, isVeg: false, portion: "1 Bowl", desc: "Homestyle chicken curry with tender potato chunks" },
          { code: "MCN-06", name: "CHICKEN ROGAN", price: 230, isVeg: false, portion: "1 Bowl", desc: "Kashmiri style aromatic chicken cooked with ratanjot & saffron spices" },
          { code: "MCN-07", name: "MUTTON DO PYAZA", price: 350, isVeg: false, portion: "1 Bowl", desc: "Tender goat meat slow cooked with caramelized onions & whole spices" },
          { code: "MCN-08", name: "MUTTON CURRY", price: 350, isVeg: false, portion: "1 Bowl", desc: "Hearty homestyle mutton gravy slow cooked to perfection" },
          { code: "MCN-09", name: "MUTTON KOSHA", price: 350, isVeg: false, portion: "1 Bowl", desc: "Rich, dark, intensely spiced dry mutton roast" },
          { code: "MCN-10", name: "FISH FRY (2pcs)", price: 180, isVeg: false, portion: "2 Pcs", desc: "Fresh local river fish marinated with turmeric and mustard oil, pan fried" },
          { code: "MCN-11", name: "FISH MASALA (2pcs)", price: 200, isVeg: false, portion: "2 Pcs", desc: "Fish cutlets simmered in a spiced onion-tomato curry" },
          { code: "MCN-12", name: "FISH CURRY (2pcs)", price: 200, isVeg: false, portion: "2 Pcs", desc: "Traditional Assam homestyle fish curry" },
          { code: "MCN-13", name: "FISH TENGA (2pcs)", price: 200, isVeg: false, portion: "2 Pcs", desc: "Authentic Assamese sour fish curry made with thekera / tomato / elephant apple" },
          { code: "MCN-14", name: "FISH SARSO (2pcs)", price: 200, isVeg: false, portion: "2 Pcs", desc: "Fish prepared in a rich stone-ground mustard seed gravy" },
          { code: "MCN-15", name: "EGG CURRY (2pcs)", price: 120, isVeg: false, portion: "2 Pcs", desc: "Two boiled and pan-fried eggs in savoury onion gravy" },
          { code: "MCN-16", name: "EGG MASALA", price: 130, isVeg: false, portion: "1 Bowl", desc: "Eggs cooked in a spiced thick masala" },
          { code: "MCN-17", name: "EGG KOSHA", price: 130, isVeg: false, portion: "1 Bowl", desc: "Eggs slow-roasted in spicy brown caramelised onion masala" },
        ],
      },

      // 8. RICE & BIRYANI (12:00 NOON - 10:45 PM)
      {
        category: "Rice & Biryani",
        servicePeriod: "A_LA_CARTE",
        availableFrom: "12:00",
        availableUntil: "22:45",
        sortOrder: 8,
        items: [
          { code: "RIC-01", name: "STEAM RICE (REGULAR)", price: 90, isVeg: true, portion: "1 Plate", desc: "Freshly steamed long grain rice" },
          { code: "RIC-02", name: "STEAM RICE (BASMATI)", price: 150, isVeg: true, portion: "1 Plate", desc: "Steamed premium aromatic long-grain Basmati rice" },
          { code: "RIC-03", name: "JEERA RICE", price: 180, isVeg: true, portion: "1 Plate", desc: "Basmati rice tempered with ghee and cumin seeds" },
          { code: "RIC-04", name: "PLAIN KHICHDI", price: 180, isVeg: true, portion: "1 Bowl", desc: "Comforting rice and yellow lentil porridge with desi ghee" },
          { code: "RIC-05", name: "VEGETABLE PULAO", price: 200, isVeg: true, portion: "1 Plate", desc: "Fragrant Basmati rice cooked with fresh seasonal vegetables & spices" },
          { code: "RIC-06", name: "CHICKEN BIRYANI", price: 250, isVeg: false, portion: "1 Handi", desc: "Dum-cooked fragrant Basmati rice layered with spiced chicken and aromatics" },
          { code: "RIC-07", name: "CHICKEN PULAO", price: 220, isVeg: false, portion: "1 Plate", desc: "Aromatic Basmati rice tossed with spiced succulent chicken morsels" },
        ],
      },
    ];

    for (const catData of menuData) {
      const category = await prisma.menuCategory.create({
        data: {
          organizationId: property.organizationId,
          propertyId: property.id,
          outletId: outlet.id,
          name: catData.category,
          servicePeriod: catData.servicePeriod,
          availableFrom: catData.availableFrom,
          availableUntil: catData.availableUntil,
          sortOrder: catData.sortOrder,
        },
      });

      for (const item of catData.items) {
        const menuItem = await prisma.menuItem.create({
          data: {
            organizationId: property.organizationId,
            propertyId: property.id,
            categoryId: category.id,
            code: item.code,
            name: item.name,
            description: item.desc,
            portionSize: item.portion,
            isVeg: item.isVeg,
            servicePeriod: catData.servicePeriod,
            availableFrom: catData.availableFrom,
            availableUntil: catData.availableUntil,
            prepTimeMinutes: 40,
            spicyLevel: item.isVeg ? (item.name.includes("CHILLY") ? 2 : 0) : (item.name.includes("KOSHA") || item.name.includes("65") ? 2 : 1),
            tags: item.code.startsWith("BF") ? "Breakfast" : item.code.includes("CHN") ? "Chinese" : item.code.includes("MCN") || item.code.includes("MCV") ? "Curry" : "Sides",
          },
        });

        await prisma.menuItemVariant.create({
          data: {
            menuItemId: menuItem.id,
            name: "Standard",
            price: item.price,
          },
        });
      }
    }
  }

  console.log("✅ Populated all menu items successfully!");
}

// Execute if run directly
if (require.main === module) {
  populateAmbarishMenu()
    .then(() => prisma.$disconnect())
    .catch((err) => {
      console.error(err);
      prisma.$disconnect();
      process.exit(1);
    });
}
