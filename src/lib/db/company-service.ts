import { prisma } from "@/lib/db/prisma";
import initialCompaniesJson from "@/data/initial-companies.json";

export interface CompanyMasterItem {
  id?: string;
  accountType: "COMPANY" | "TRAVEL_AGENT" | "OTA" | "CORPORATE";
  accountName: string;
  shortName?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  faxNo?: string | null;
  gstin?: string | null;
  panNo?: string | null;
  foodPlan?: string | null;
  fbDiscountPercent?: number;
  creditLimit?: number;
  openingBalance?: number;
  commissionPercent?: number;
  remarks?: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

// Global In-Memory Fallback Registry (Guarantees instant UI data even if DB is reloading)
let memoryCompanies: CompanyMasterItem[] = initialCompaniesJson.map((c, idx) => ({
  id: `comp-init-${idx + 1}`,
  ...c,
  accountType: (c.accountType as any) || "COMPANY",
  foodPlan: c.foodPlan || "EP",
  status: (c.status as any) || "ACTIVE",
}));

export async function ensureDefaultCompanies(organizationId?: string) {
  try {
    if ((prisma as any)?.companyMaster?.count) {
      const count = await (prisma as any).companyMaster.count();
      if (count === 0) {
        let orgId = organizationId;
        if (!orgId) {
          const org = await prisma.organization.findFirst();
          orgId = org?.id || "org_ambarish";
        }
        const prop = await prisma.property.findFirst();
        const propertyId = prop?.id || "prop_ambarish";

        for (const item of initialCompaniesJson) {
          await (prisma as any).companyMaster.create({
            data: {
              organizationId: orgId,
              propertyId,
              accountType: item.accountType || "COMPANY",
              accountName: item.accountName,
              shortName: item.shortName || null,
              city: item.city || null,
              address: item.address || null,
              phone: item.phone || null,
              mobile: item.mobile || null,
              email: item.email || null,
              gstin: item.gstin || null,
              panNo: item.panNo || null,
              foodPlan: item.foodPlan || "EP",
              creditLimit: item.creditLimit || 0,
              commissionPercent: item.commissionPercent || 0,
              status: item.status || "ACTIVE",
              remarks: item.remarks || null,
            },
          });
        }
      }
    }
  } catch (error) {
    console.warn("DB seed check bypassed, using local memory registry:", error);
  }
}

export async function getCompanyMasterList(organizationId?: string, search?: string, type?: string): Promise<CompanyMasterItem[]> {
  try {
    await ensureDefaultCompanies(organizationId);

    if ((prisma as any)?.companyMaster?.findMany) {
      const dbList = await (prisma as any).companyMaster.findMany({
        where: {
          ...(type && type !== "ALL"
            ? type === "TRAVEL_AGENT"
              ? { accountType: { in: ["TRAVEL_AGENT", "OTA"] } }
              : { accountType: type }
            : {}),
          ...(search
            ? {
                OR: [
                  { accountName: { contains: search } },
                  { shortName: { contains: search } },
                  { gstin: { contains: search } },
                  { mobile: { contains: search } },
                  { city: { contains: search } },
                  { address: { contains: search } },
                ],
              }
            : {}),
        },
        orderBy: { accountName: "asc" },
      });

      if (dbList && dbList.length > 0) {
        return dbList;
      }
    }
  } catch (e) {
    console.warn("Falling back to in-memory company directory:", e);
  }

  // Pure in-memory filtering fallback
  let list = [...memoryCompanies];

  if (type && type !== "ALL") {
    if (type === "TRAVEL_AGENT") {
      list = list.filter((c) => c.accountType === "TRAVEL_AGENT" || c.accountType === "OTA");
    } else {
      list = list.filter((c) => c.accountType === type);
    }
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (c) =>
        c.accountName?.toLowerCase().includes(q) ||
        c.shortName?.toLowerCase().includes(q) ||
        c.gstin?.toLowerCase().includes(q) ||
        c.mobile?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }

  return list.sort((a, b) => a.accountName.localeCompare(b.accountName));
}

export async function addCompanyToMaster(data: any): Promise<CompanyMasterItem> {
  const newComp: CompanyMasterItem = {
    id: `comp-custom-${Date.now()}`,
    accountType: data.accountType || "COMPANY",
    accountName: data.accountName.trim(),
    shortName: data.shortName?.trim() || null,
    city: data.city?.trim() || null,
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    mobile: data.mobile?.trim() || null,
    email: data.email?.trim() || null,
    faxNo: data.faxNo?.trim() || null,
    gstin: data.gstin?.trim() ? data.gstin.trim().toUpperCase() : null,
    panNo: data.panNo?.trim() ? data.panNo.trim().toUpperCase() : null,
    foodPlan: data.foodPlan || "EP",
    fbDiscountPercent: Number(data.fbDiscountPercent) || 0,
    creditLimit: Number(data.creditLimit) || 0,
    openingBalance: Number(data.openingBalance) || 0,
    commissionPercent: Number(data.commissionPercent) || 0,
    remarks: data.remarks?.trim() || null,
    status: "ACTIVE",
  };

  try {
    if ((prisma as any)?.companyMaster?.create) {
      const created = await (prisma as any).companyMaster.create({
        data: {
          organizationId: data.organizationId || "org_ambarish",
          propertyId: data.propertyId || "prop_ambarish",
          ...newComp,
        },
      });
      memoryCompanies.unshift(created);
      return created;
    }
  } catch (e) {
    console.warn("Saved to memory only:", e);
  }

  memoryCompanies.unshift(newComp);
  return newComp;
}
