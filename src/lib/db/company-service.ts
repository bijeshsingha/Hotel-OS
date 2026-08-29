import { prisma } from "@/lib/db/prisma";
import initialCompanies from "@/data/initial-companies.json";

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

export async function ensureDefaultCompanies(organizationId: string) {
  try {
    // Check if any companies already exist in DB
    const count = await (prisma as any).companyMaster.count({
      where: { organizationId },
    });

    if (count === 0) {
      for (const item of initialCompanies) {
        await (prisma as any).companyMaster.create({
          data: {
            organizationId,
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
  } catch (error) {
    console.error("Failed to seed initial companies:", error);
  }
}

export async function getCompanyMasterList(organizationId: string, search?: string, type?: string) {
  await ensureDefaultCompanies(organizationId);

  return await (prisma as any).companyMaster.findMany({
    where: {
      organizationId,
      ...(type && type !== "ALL" ? { accountType: type } : {}),
      ...(search
        ? {
            OR: [
              { accountName: { contains: search } },
              { shortName: { contains: search } },
              { gstin: { contains: search } },
              { mobile: { contains: search } },
              { city: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: { accountName: "asc" },
  });
}
