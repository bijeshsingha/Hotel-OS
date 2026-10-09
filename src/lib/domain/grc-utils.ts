import type { GrcData } from "@/components/pms/printable-grc";

/**
 * Detects whether a signature data URL contains an actual, non-blank signature.
 * Filters out null/empty strings, truncated data, and known blank/empty canvas exports.
 */
export function isEffectiveSignature(sig?: string | null): boolean {
  if (!sig || typeof sig !== "string") return false;
  const trimmed = sig.trim();
  if (trimmed.length < 150) return false;
  // Known 300x150 blank white canvas PNG exports
  if (
    trimmed.includes("iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAYAAABkW7XSAAAF10lEQVR4Ae") ||
    trimmed.includes("iVBORw0KGgoAAAANSUhEUgAAASwAAACWCAYAAABkW7XSAAA")
  ) {
    return false;
  }
  return true;
}

export function formatRegistrationToGrcData(reg: any): GrcData {
  if (!reg) return { fullName: "Guest" };

  let coGuests: any[] = [];
  if (reg.coGuestsJson) {
    try {
      const parsed = typeof reg.coGuestsJson === "string" ? JSON.parse(reg.coGuestsJson) : reg.coGuestsJson;
      if (Array.isArray(parsed)) coGuests = parsed;
    } catch {}
  }

  let foreignDetails: any = undefined;
  if (reg.foreignPassportDetailsJson) {
    try {
      const parsed =
        typeof reg.foreignPassportDetailsJson === "string"
          ? JSON.parse(reg.foreignPassportDetailsJson)
          : reg.foreignPassportDetailsJson;
      if (parsed && typeof parsed === "object") foreignDetails = parsed;
    } catch {}
  }

  const roomDisplay = reg.assignedRoomNumber || reg.preAssignedRoom || "";
  const validSignature = isEffectiveSignature(reg.signatureDataUrl) ? reg.signatureDataUrl : undefined;

  return {
    id: reg.id,
    grcNo: reg.registrationNo || `GRC-${reg.id?.slice(-6)?.toUpperCase()}`,
    registrationNo: reg.registrationNo,
    roomNumber: roomDisplay,
    assignedRoomNumber: reg.assignedRoomNumber,
    preAssignedRoom: reg.preAssignedRoom,
    arrivalDateTime: reg.arrivalDateTime,
    expectedDepartureDate: reg.expectedDepartureDate,
    fullName: reg.fullName || "Guest",
    age: reg.age,
    gender: reg.gender,
    nationality: reg.nationality || "Indian",
    fatherSpouseName: reg.fatherSpouseName,
    profession: reg.profession,
    streetAddress: reg.streetAddress,
    policeStation: reg.policeStation,
    city: reg.city,
    pinZipCode: reg.pinZipCode,
    state: reg.state,
    country: reg.country || "India",
    arrivedFrom: reg.arrivedFrom,
    goingTo: reg.goingTo,
    purposeOfVisit: reg.purposeOfVisit,
    referralChannel: reg.referralChannel,
    phone: reg.mobilePhone || reg.alternatePhone,
    mobilePhone: reg.mobilePhone,
    alternatePhone: reg.alternatePhone,
    email: reg.email,
    driverName: reg.driverName,
    vehicleNumber: reg.vehicleNumber,
    idType: reg.idDocumentType,
    idDocumentType: reg.idDocumentType,
    idDocumentNumber: reg.idDocumentNumber,
    idPhotoUrl: reg.idPhotoUrl,
    signatureDataUrl: validSignature,
    depositAmount: reg.depositAmount,
    paymentMethod: reg.paymentMethod || "CASH",
    tariff: reg.tariff || reg.roomRate || reg.rate,
    mealPlan: reg.mealPlan || "EP (Room Only)",
    billingInstructions: reg.billingInstructions || (reg.paymentMethod ? `Direct Settlement (${reg.paymentMethod})` : "Direct Guest Settlement"),
    coGuests,
    foreignDetails,
  };
}
