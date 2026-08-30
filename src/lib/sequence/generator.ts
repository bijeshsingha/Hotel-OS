import { prisma } from "../db/prisma";

export type DocumentType =
  | "INVOICE"
  | "CREDIT_NOTE"
  | "RECEIPT"
  | "REFUND"
  | "KOT"
  | "ORDER"
  | "RESERVATION"
  | "MAINTENANCE"
  | "GRC";

export async function getNextDocumentNumber(
  propertyId: string,
  documentType: DocumentType,
  scopeKey = "PROPERTY"
): Promise<{ formattedNumber: string; nextVal: number; prefix: string; financialYear: string }> {
  // Current financial year in India: Apr 1 to Mar 31
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = fyStart + 1;
  const fyShort = `${String(fyStart).slice(2)}${String(fyEnd).slice(2)}`; // e.g. "2627"
  const financialYear = `${fyStart}-${fyEnd}`; // e.g. "2026-2027"

  let defaultPrefix = `${documentType}-`;
  if (documentType === "INVOICE") defaultPrefix = `INV-${fyShort}-`;
  else if (documentType === "CREDIT_NOTE") defaultPrefix = `CN-${fyShort}-`;
  else if (documentType === "RECEIPT") defaultPrefix = `REC-${fyShort}-`;
  else if (documentType === "REFUND") defaultPrefix = `REF-${fyShort}-`;
  else if (documentType === "RESERVATION") defaultPrefix = `RES-${fyShort}-`;
  else if (documentType === "GRC") defaultPrefix = `GRC-${fyShort}-`;
  else if (documentType === "KOT") defaultPrefix = `KOT-`;
  else if (documentType === "ORDER") defaultPrefix = `ORD-`;
  else if (documentType === "MAINTENANCE") defaultPrefix = `MNT-`;

  // Fetch organizationId from property
  const prop = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { organizationId: true },
  });
  const orgId = prop?.organizationId || "org_ambarish";

  // Upsert document sequence record atomically
  const sequence = await prisma.documentSequence.upsert({
    where: {
      propertyId_documentType_scopeKey_financialYear: {
        propertyId,
        documentType,
        scopeKey,
        financialYear,
      },
    },
    create: {
      organizationId: orgId,
      propertyId,
      documentType,
      scopeKey,
      financialYear,
      prefix: defaultPrefix,
      nextValue: 2,
      padding: 4,
    },
    update: {
      nextValue: {
        increment: 1,
      },
    },
  });

  const currentVal = sequence.nextValue - 1;
  const padded = String(currentVal).padStart(sequence.padding, "0");
  const formattedNumber = `${sequence.prefix}${padded}`;

  return {
    formattedNumber,
    nextVal: currentVal,
    prefix: sequence.prefix,
    financialYear,
  };
}
