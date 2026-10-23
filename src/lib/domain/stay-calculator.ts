/**
 * Stay & Billing Calculation Engine
 * 
 * Pure mathematical and date-handling calculations for 24-hour cycles,
 * fixed-time checkouts, grace periods, and dynamic stay extensions.
 * Safe for both Client Components and Server-side route handlers.
 */

export function getLocalHourMinute(date: Date | string): { hour: number; minute: number } {
  const d = new Date(date);
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const hourPart = parts.find((p) => p.type === "hour")?.value;
    const minutePart = parts.find((p) => p.type === "minute")?.value;
    return {
      hour: hourPart ? parseInt(hourPart, 10) : d.getHours(),
      minute: minutePart ? parseInt(minutePart, 10) : d.getMinutes(),
    };
  } catch {
    return { hour: d.getHours(), minute: d.getMinutes() };
  }
}

export function calculate24HrBillableDays(
  arrivalAt: Date | string,
  departureAt: Date | string,
  checkoutType: "24_HOURS" | "FIXED_TIME" = "FIXED_TIME",
  gracePeriodMinutes: number = 0
): {
  billableDays: number;
  hoursElapsed: number;
  gracePeriodApplied: boolean;
  isEarlyBird: boolean;
  checkoutDeadlineText: string;
} {
  const start = new Date(arrivalAt).getTime();
  const end = new Date(departureAt).getTime();
  const elapsedMinutes = Math.max(0, Math.round((end - start) / (1000 * 60)));
  const hoursElapsed = Math.round((elapsedMinutes / 60) * 10) / 10;

  // Check if check-in qualifies for Early Bird Offer (5:00 AM to 11:00 AM check-in)
  const { hour: arrHour } = getLocalHourMinute(arrivalAt);
  const isEarlyBird = arrHour >= 5 && arrHour < 11;

  const isWaiveNextNight = gracePeriodMinutes >= 1440;
  // If waiving next night, compute baseline nights without the 1440m grace
  const effectiveGraceMinutes = isWaiveNextNight ? 0 : gracePeriodMinutes;

  // STANDARD 11:00 AM - 12:00 PM FIXED TIME BILLING (DEFAULT - TWO-WAY GRACE: EARLY CHECK-IN & LATE CHECKOUT):
  if (checkoutType === "FIXED_TIME" || !checkoutType) {
    const arrDate = new Date(arrivalAt);
    const endDate = new Date(departureAt);

    // Base checkout noon on the day following arrival
    const baseCheckoutNoon = new Date(arrDate);
    baseCheckoutNoon.setDate(baseCheckoutNoon.getDate() + 1);
    baseCheckoutNoon.setHours(12, 0, 0, 0);

    // Operational Checkout Grace Buffer:
    // Hotels provide a standard 60-minute buffer (until 1:00 PM) for guests packing/settling bill at desk,
    // or the manager-selected grace period if greater.
    const operationalGraceMinutes = Math.max(effectiveGraceMinutes, 60);
    const checkoutGraceMs = operationalGraceMinutes * 60 * 1000;

    let currentDeadlineMs = baseCheckoutNoon.getTime();
    let regularNights = 1;

    while (endDate.getTime() > currentDeadlineMs + checkoutGraceMs) {
      regularNights++;
      currentDeadlineMs += 24 * 60 * 60 * 1000;
    }

    const lateGraceApplied =
      endDate.getTime() > currentDeadlineMs &&
      endDate.getTime() <= currentDeadlineMs + checkoutGraceMs;

    const unWaivedNights = regularNights;

    let billableDays = unWaivedNights;
    let graceApplied = lateGraceApplied;
    let deadlineText = "";

    if (isWaiveNextNight) {
      if (unWaivedNights > 1) {
        // Waive only the latest/next night
        billableDays = unWaivedNights - 1;
        graceApplied = true;
        deadlineText = `Standard 11-12 PM (Next Night Waived • ${billableDays} of ${unWaivedNights} Billed)`;
      } else {
        // Not applicable when only 1 night stayed
        billableDays = 1;
        graceApplied = false;
        deadlineText = "Standard 11-12 PM (Waive not applicable: 1 night stay)";
      }
    } else {
      const graceText =
        gracePeriodMinutes > 0
          ? ` • ${Math.round(gracePeriodMinutes / 60)}h Grace`
          : lateGraceApplied
          ? " • 1h Grace (Until 1:00 PM)"
          : "";
      deadlineText = isEarlyBird
        ? `Standard 11-12 PM Check-Out (Early Bird Offer${graceText})`
        : `Standard 11-12 PM Check-Out${graceText}`;
    }

    return {
      billableDays,
      hoursElapsed,
      gracePeriodApplied: graceApplied,
      isEarlyBird,
      checkoutDeadlineText: deadlineText,
    };
  }

  // OPTIONAL 24_HOURS CYCLE:
  const completedBlocks = Math.floor(elapsedMinutes / (24 * 60));
  const remainderMinutes = elapsedMinutes % (24 * 60);

  let unWaivedDays = 1;
  let within24HrGrace = false;

  if (completedBlocks === 0) {
    unWaivedDays = 1;
  } else if (remainderMinutes <= effectiveGraceMinutes) {
    unWaivedDays = completedBlocks;
    within24HrGrace = effectiveGraceMinutes > 0;
  } else {
    unWaivedDays = completedBlocks + 1;
  }

  let billableDays = unWaivedDays;
  let graceApplied = within24HrGrace;
  let deadlineText = "";

  if (isWaiveNextNight) {
    if (unWaivedDays > 1) {
      billableDays = unWaivedDays - 1;
      graceApplied = true;
      deadlineText = `24-Hr Cycle (Next Night Waived • ${billableDays} of ${unWaivedDays} Billed)`;
    } else {
      billableDays = 1;
      graceApplied = false;
      deadlineText = "24-Hr Cycle (Waive not applicable: 1 night stay)";
    }
  } else {
    graceApplied = within24HrGrace;
    deadlineText = effectiveGraceMinutes > 0
      ? `24-Hr Cycle • ${Math.round(effectiveGraceMinutes / 60)}h Grace`
      : completedBlocks > 0 && remainderMinutes > 0
      ? "24-Hr Cycle (Rollover Billed)"
      : "24-Hr Cycle Billing";
  }

  return {
    billableDays,
    hoursElapsed,
    gracePeriodApplied: graceApplied,
    isEarlyBird: false,
    checkoutDeadlineText: deadlineText,
  };
}

/**
 * Calculates the dynamic departure date for a stay when a guest stays beyond the scheduled departure time.
 * If the current time exceeds the scheduled departure (or passes checkout grace), the departure date
 * automatically advances to match the guest's current active billing cycle / night.
 * If the guest booked future nights in advance, the scheduled departure date is never reduced.
 */
export function calculateDynamicDepartureDate({
  arrivalAt,
  expectedDepartureAt,
  checkoutType = "FIXED_TIME",
  gracePeriodMinutes = 0,
  now = new Date(),
}: {
  arrivalAt: Date | string;
  expectedDepartureAt: Date | string;
  checkoutType?: "24_HOURS" | "FIXED_TIME";
  gracePeriodMinutes?: number;
  now?: Date | string;
}): {
  effectiveDepartureAt: Date;
  isExtended: boolean;
  extensionNights: number;
  originalDepartureAt: Date;
  billableNights: number;
} {
  const arr = new Date(arrivalAt);
  const origExp = new Date(expectedDepartureAt);
  const currentTime = now ? new Date(now) : new Date();

  // If stay hasn't reached original expected departure, keep original
  if (currentTime.getTime() <= origExp.getTime()) {
    return {
      effectiveDepartureAt: origExp,
      isExtended: false,
      extensionNights: 0,
      originalDepartureAt: origExp,
      billableNights: 1,
    };
  }

  const isWaiveNextNight = gracePeriodMinutes >= 1440;
  const effectiveGraceMinutes = isWaiveNextNight ? 0 : gracePeriodMinutes;

  if (checkoutType === "24_HOURS") {
    const elapsedMinutes = Math.max(0, Math.round((currentTime.getTime() - arr.getTime()) / (1000 * 60)));
    const completedBlocks = Math.floor(elapsedMinutes / (24 * 60));
    const remainderMinutes = elapsedMinutes % (24 * 60);

    let activeCycles = completedBlocks;
    if (remainderMinutes > effectiveGraceMinutes) {
      activeCycles = completedBlocks + 1;
    }
    const targetCycles = Math.max(1, activeCycles);
    const dynamicDeadline = new Date(arr.getTime() + targetCycles * 24 * 60 * 60 * 1000);

    const isExtended = dynamicDeadline.getTime() > origExp.getTime();
    const extensionNights = isExtended
      ? Math.max(1, Math.round((dynamicDeadline.getTime() - origExp.getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    return {
      effectiveDepartureAt: isExtended ? dynamicDeadline : origExp,
      isExtended,
      extensionNights,
      originalDepartureAt: origExp,
      billableNights: targetCycles,
    };
  }

  // Standard FIXED_TIME (11:00 AM – 12:00 PM check-out):
  const arrDate = new Date(arr);
  const baseCheckoutNoon = new Date(arrDate);
  baseCheckoutNoon.setDate(baseCheckoutNoon.getDate() + 1);
  baseCheckoutNoon.setHours(12, 0, 0, 0);

  const operationalGraceMinutes = Math.max(effectiveGraceMinutes, 60);
  const checkoutGraceMs = operationalGraceMinutes * 60 * 1000;

  let currentDeadlineMs = baseCheckoutNoon.getTime();
  let regularNights = 1;

  while (currentTime.getTime() > currentDeadlineMs + checkoutGraceMs) {
    regularNights++;
    currentDeadlineMs += 24 * 60 * 60 * 1000;
  }

  // Preserve scheduled checkout time of day (or default to 11:00 AM)
  const origHour = origExp.getHours();
  const origMinute = origExp.getMinutes();
  const targetHour = origHour === 0 && origMinute === 0 ? 11 : origHour;
  const targetMinute = origHour === 0 && origMinute === 0 ? 0 : origMinute;

  const dynamicDeadline = new Date(currentDeadlineMs);
  dynamicDeadline.setHours(targetHour, targetMinute, 0, 0);

  // If dynamic deadline (e.g. 11:00 AM) has already passed by more than checkoutGraceMs today, roll to next day
  if (currentTime.getTime() > dynamicDeadline.getTime() + checkoutGraceMs) {
    dynamicDeadline.setDate(dynamicDeadline.getDate() + 1);
  }

  const isExtended = dynamicDeadline.getTime() > origExp.getTime();
  const extensionNights = isExtended
    ? Math.max(1, Math.round((dynamicDeadline.getTime() - origExp.getTime()) / (24 * 60 * 60 * 1000)))
    : 0;

  return {
    effectiveDepartureAt: isExtended ? dynamicDeadline : origExp,
    isExtended,
    extensionNights,
    originalDepartureAt: origExp,
    billableNights: regularNights,
  };
}

/**
 * Resolves the effective departure date for a Stay record, automatically parsing room assignments
 * for rate handling and grace periods if present.
 */
export function getEffectiveStayDeparture(
  stay: {
    arrivalAt: Date | string;
    expectedDepartureAt: Date | string;
    actualDepartureAt?: Date | string | null;
    status?: string;
    roomAssignments?: any[];
  },
  now: Date = new Date()
) {
  if (stay.status !== "IN_HOUSE" || stay.actualDepartureAt) {
    const dep = stay.actualDepartureAt || stay.expectedDepartureAt;
    return {
      effectiveDepartureAt: new Date(dep),
      isExtended: false,
      extensionNights: 0,
      originalDepartureAt: new Date(stay.expectedDepartureAt),
      billableNights: 1,
    };
  }

  let checkoutType: "24_HOURS" | "FIXED_TIME" = "FIXED_TIME";
  let graceMinutes = 0;

  const activeAssignment =
    stay.roomAssignments?.find((a: any) => !a.endsAt) || stay.roomAssignments?.[0];

  if (activeAssignment?.rateHandling) {
    if (activeAssignment.rateHandling.includes("24_HOURS:")) {
      checkoutType = "24_HOURS";
      graceMinutes = Number(activeAssignment.rateHandling.split(":")[1]) || 0;
    } else if (activeAssignment.rateHandling.includes("FIXED_TIME:")) {
      checkoutType = "FIXED_TIME";
      graceMinutes = Number(activeAssignment.rateHandling.split(":")[1]) || 0;
    } else if (activeAssignment.rateHandling === "24_HOURS") {
      checkoutType = "24_HOURS";
    }
  }

  return calculateDynamicDepartureDate({
    arrivalAt: stay.arrivalAt,
    expectedDepartureAt: stay.expectedDepartureAt,
    checkoutType,
    gracePeriodMinutes: graceMinutes,
    now,
  });
}
