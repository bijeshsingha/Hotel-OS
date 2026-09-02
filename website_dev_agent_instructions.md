# Hotel Ambarish Website — PMS Integration Instructions
## Step-by-Step Implementation Guide for Website Developer Agent

**Hotel:** Hotel Ambarish Grand Residency, MD Shah Road, Paltan Bazar, Guwahati, Assam - 781008  
**PMS System:** Hotel OS (Port `3000`)  
**Website Frontend:** Next.js / React (Port `3005`)  
**Specification Reference:** `pms_b2b_and_web_integration_spec.md`  

---

## 🎯 Objective
Connect the **Hotel Ambarish Website** directly to the **Hotel OS PMS API Gateway** so that:
1. Online bookings (B2C retail & B2B corporate/agent) flow automatically into the hotel front desk system with zero manual entry.
2. Physical room availability (35 rooms across floors 2 to 6) is queried in real time to prevent overbooking.
3. Corporate rate requests and banquet RFPs are logged directly into the PMS CRM.
4. Guests and corporate bookers receive official PMS confirmation numbers (e.g. `RES-2627-XXXX`) on printable vouchers.

---

## 🛠️ Step-by-Step Implementation Tasks

### Step 1: Configure Environment Variables
In `.env.local` on the website project (and production hosting settings):

```env
# Hotel OS PMS API Gateway
PMS_API_URL=http://localhost:3000/api/v1
PMS_API_SECRET=ambarish_pms_secret_2026

# Email Notifications
NOTIFICATION_EMAIL=hotelambarish@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=hotelambarish@gmail.com
SMTP_PASS=your_gmail_app_password
```

---

### Step 2: Live Room Availability & Inventory Check
Before allowing a guest to proceed with room selection or checkout, query live availability to prevent overbooking.

* **Endpoint:** `GET ${PMS_API_URL}/availability/quote`
* **Query Parameters:** `arrivalDate=YYYY-MM-DD` and `departureDate=YYYY-MM-DD`
* **When to Call:** When dates change on `/booking` or `/rooms`.

#### Implementation Example (TypeScript / Next.js):
```ts
export async function fetchRoomAvailability(checkIn: string, checkOut: string) {
  const pmsUrl = process.env.PMS_API_URL || "http://localhost:3000/api/v1";
  const res = await fetch(
    `${pmsUrl}/availability/quote?arrivalDate=${checkIn}&departureDate=${checkOut}`,
    {
      headers: {
        "x-api-key": process.env.PMS_API_SECRET || "",
      },
      next: { revalidate: 60 }, // Cache for 60s
    }
  );
  if (!res.ok) throw new Error("Failed to fetch live availability");
  return res.json();
}
```

#### Category Codes Reference:
- `DELUXE_KING`: Double Deluxe Room (King Bed) — Max 10 Rooms
- `DELUXE_TWIN`: Double Deluxe Room (Twin Beds) — Max 15 Rooms
- `EXEC_KING`: Executive Room (King Bed) — Max 3 Rooms
- `EXEC_TWIN`: Executive Room (Twin Beds) — Max 5 Rooms
- `SUITE`: Presidential Suite (King Bed) — Max 2 Rooms

---

### Step 3: Forward Confirmed Bookings (Checkout Submission)
Upon checkout form submission (or upon Razorpay payment success callback on `/api/checkout`), forward the booking payload to the PMS.

* **Endpoint:** `POST ${PMS_API_URL}/reservations`
* **Method:** `POST`
* **Headers:** `Content-Type: application/json`, `x-api-key: ambarish_pms_secret_2026`

#### Payload Format to Send:
```json
{
  "bookingType": "INDIVIDUAL",
  "source": "WEBSITE",
  "channelRef": "WEB-98421",
  "checkIn": "2026-09-15",
  "checkOut": "2026-09-18",
  "nights": 3,
  "rooms": 2,
  "adults": 4,
  "children": 1,

  "bookedRooms": [
    {
      "categoryCode": "DELUXE_KING",
      "roomName": "Double Deluxe Room",
      "bedType": "King Bed",
      "ratePlanCode": "EP",
      "pricePerNight": 3200,
      "quantity": 1
    },
    {
      "categoryCode": "DELUXE_TWIN",
      "roomName": "Double Deluxe Room",
      "bedType": "Twin Bed",
      "ratePlanCode": "CP",
      "pricePerNight": 3600,
      "quantity": 1
    }
  ],

  "guestName": "BIJESH SHARMA",
  "guestPhone": "09876543210",
  "guestEmail": "bijesh@example.com",
  "guestCity": "GUWAHATI",
  "guestState": "ASSAM",
  "guestNationality": "INDIAN",
  "guestGstin": "18AAAAA0000A1Z5",

  "b2b": {
    "accountType": "CORPORATE",
    "companyName": "OIL INDIA LIMITED",
    "companyGstin": "18AABCO1234F1ZX",
    "corporateEmail": "traveldesk@oilindia.in",
    "poNumber": "PO-2026-8812",
    "billingInstruction": "BILL_TO_COMPANY"
  },

  "specialRequests": "Non-smoking room, high floor",
  "promoCode": "DIRECT10",
  "discountAmount": 1000,
  "baseAmount": 19400,
  "taxAmount": 970,
  "totalAmount": 20370,
  "paymentMethod": "PAY_AT_HOTEL",
  "paymentId": "PAY_AT_HOTEL",
  "depositAmount": 0
}
```

#### Handling the PMS Response:
Extract `confirmationNo` (e.g. `RES-2627-0125`) from `response.data` and render it on the guest voucher:
```tsx
const data = await pmsRes.json();
if (data.success && data.confirmationNo) {
  // Store confirmation number for guest display
  setBookingConfirmationNumber(data.confirmationNo);
}
```

---

### Step 4: B2B Corporate Inquiries & Banquet RFPs

#### A. Corporate & Travel Agent Onboarding Form (`POST /b2b/enquiry`)
When a company or travel agency submits an inquiry for contracted corporate rates:
```ts
await fetch(`${process.env.PMS_API_URL}/b2b/enquiry`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    enquiryType: "CORPORATE_RATE_CONTRACT",
    companyName: formData.companyName,
    accountType: formData.isAgent ? "TRAVEL_AGENT" : "CORPORATE",
    contactPerson: formData.contactPerson,
    designation: formData.designation,
    email: formData.email,
    phone: formData.phone,
    gstin: formData.gstin,
    city: formData.city,
    state: formData.state,
    estimatedMonthlyRoomNights: Number(formData.estimatedRoomNights),
    requiredMealPlans: formData.mealPlans, // e.g. ["EP", "CP"]
    billingPreference: formData.billingPreference, // "BILL_TO_COMPANY"
    message: formData.message,
  }),
});
```

#### B. Banquet & Event RFP Form (`POST /events/enquiry`)
When a planner requests a quote for a conference, wedding, or banquet:
```ts
await fetch(`${process.env.PMS_API_URL}/events/enquiry`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    eventType: formData.eventType, // "CORPORATE_CONFERENCE" | "WEDDING" | "SEMINAR"
    eventTitle: formData.eventTitle,
    eventDate: formData.eventDate,
    durationDays: Number(formData.durationDays) || 1,
    attendees: Number(formData.attendees),
    seatingLayout: formData.seatingLayout, // "THEATER" | "ROUND_TABLE" | "U_SHAPE"
    requiredRoomBlocks: {
      deluxeRooms: Number(formData.deluxeRooms) || 0,
      executiveRooms: Number(formData.executiveRooms) || 0,
      suites: Number(formData.suites) || 0,
    },
    cateringRequirements: {
      morningTea: formData.needMorningTea,
      buffetLunch: formData.needBuffetLunch,
      eveningHighTea: formData.needHighTea,
      galaDinner: formData.needDinner,
    },
    organizerName: formData.organizerName,
    organizerCompany: formData.organizerCompany,
    organizerPhone: formData.organizerPhone,
    organizerEmail: formData.organizerEmail,
    budgetEstimate: Number(formData.budget) || undefined,
    additionalNotes: formData.notes,
  }),
});
```

---

## 📋 Pre-Launch Developer Verification Checklist

- [ ] **Children Policy**: Children stay complimentary (₹0 / Free of charge). Ensure no extra bed or extra person surcharge is added for children.
- [ ] **Bed Types**: Guest can pick King Bed vs Twin Bed on Deluxe and Executive rooms.
- [ ] **B2B Toggle**: Checkout has a checkbox/tab: *"Booking on behalf of Company / Travel Agency"*.
- [ ] **Uppercase Normalization**: Guest names, cities, states, and company names are auto-capitalized (`.toUpperCase()`).
- [ ] **Session Caching**: Session cookies `ambarish_guest_profile` and `ambarish_stay_params` pre-fill checkout for repeat visitors.
- [ ] **Live Inventory**: Sold-out room categories are disabled based on `GET /api/v1/availability/quote`.
- [ ] **PMS Confirmation Display**: Printable voucher displays the official PMS confirmation number (`RES-2627-XXXX`).
