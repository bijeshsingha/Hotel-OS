import { POST } from "../src/app/api/v1/reservations/route";
import { prisma } from "../src/lib/db/prisma";

if (!process.env.DATABASE_URL?.endsWith("operations-test.db") || process.env.DATABASE_URL !== process.env.HOTEL_OS_TEST_DATABASE_URL || !process.send) throw new Error("Use the disposable cross-process review fixture.");
process.env.APP_ORIGIN = "http://booking-review.test";
async function main() {
 await prisma.$connect();
 process.once("message", async () => {
  try {
    const response = await POST(new Request("http://booking-review.test/api/v1/reservations", { method: "POST", headers: { Cookie: process.env.REVIEW_SYNTHETIC_COOKIE!, "Content-Type": "application/json" }, body: process.env.REVIEW_SYNTHETIC_BODY! }));
    process.send!({ status: response.status });
  } catch {
    process.send!({ status: 0 });
  } finally {
    await prisma.$disconnect();
    process.disconnect?.();
  }
 });
 process.send!({ ready: true });
}
main().catch(async () => { process.send?.({ status: 0, ready: true }); await prisma.$disconnect(); process.disconnect?.(); });
