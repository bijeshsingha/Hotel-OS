import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const testRoot = process.cwd();
const fixtureUrl = process.env.HOTEL_OS_TEST_DATABASE_URL;
if (!fixtureUrl?.startsWith("file:") || !fixtureUrl.endsWith("security-test.db")) throw new Error("Run npm run test:auth to create an isolated fixture database.");
process.env.DATABASE_URL = fixtureUrl;
process.env.APP_ORIGIN = "http://security.test";
let prisma: typeof import("../src/lib/db/prisma").prisma;
let passwordModule: typeof import("../src/lib/auth/password");
let sessionModule: typeof import("../src/lib/auth/session");
let accessModule: typeof import("../src/lib/auth/api-access");
let ownerCookie: string;
let agentCookie: string;
const passwords = { owner: randomUUID(), agent: randomUUID(), viewer: randomUUID() };

function request(route: string, method = "GET", body?: unknown, cookie?: string, extra: Record<string,string> = {}) {
  return new Request(`http://security.test/api/v1/${route}`, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}
async function login(name: keyof typeof passwords) {
  const { POST } = await import("../src/app/api/v1/auth/verify/route");
  const response = await POST(request("auth/verify", "POST", { identifier: `${name}@example.invalid`, password: passwords[name] }));
  assert.equal(response.status,200);
  return { response, cookie: response.headers.get("set-cookie")!.split(";")[0] };
}
before(async () => {
  ({ prisma } = await import("../src/lib/db/prisma"));
  passwordModule = await import("../src/lib/auth/password");
  sessionModule = await import("../src/lib/auth/session");
  accessModule = await import("../src/lib/auth/api-access");
  const businessDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  for (const suffix of ["a","b"]) await prisma.organization.create({ data: { id: `org-${suffix}`, legalName: `Synthetic ${suffix}`, displayName: `Synthetic ${suffix}` } });
  for (const [id, org] of [["prop-a","org-a"],["prop-a2","org-a"],["prop-b","org-b"]]) await prisma.property.create({ data: { id, organizationId: org, code: id, legalName: id, displayName: id, businessDate } });
  for (const code of ["ORG_OWNER","FD_AGENT","VIEWER"]) await prisma.role.create({ data: { id: code, code, name: code } });
  for (const [name,code] of [["owner","ORG_OWNER"],["agent","FD_AGENT"],["viewer","VIEWER"]] as const) await prisma.user.create({ data: { id: name, name, email: `${name}@example.invalid`, passwordHash: passwordModule.hashPassword(passwords[name]), memberships: { create: { organizationId: "org-a", propertyGrants: { create: { propertyId: "prop-a", roleId: code } } } } } });
  await prisma.user.create({ data: { id: "other-owner", name: "Other Owner", email: "other@example.invalid", passwordHash: passwordModule.hashPassword(randomUUID()), memberships: { create: { organizationId: "org-b", propertyGrants: { create: { propertyId: "prop-b", roleId: "ORG_OWNER" } } } } } });
  await prisma.guest.create({ data: { id: "guest-a", organizationId: "org-a", name: "Synthetic A", phone: "9000000001" } });
  await prisma.guest.create({ data: { id: "guest-b", organizationId: "org-b", name: "Synthetic B", phone: "9000000002" } });
  for (const id of ["a","a-other","b"]) {
    const propertyId = id === "b" ? "prop-b" : "prop-a";
    const organizationId = id === "b" ? "org-b" : "org-a";
    await prisma.stay.create({ data: { id: `stay-${id}`, propertyId, organizationId, primaryGuestId: id === "b" ? "guest-b" : "guest-a", expectedDepartureAt: new Date("2026-12-01T12:00:00Z") } });
    await prisma.folio.create({ data: { id: `folio-${id}`, propertyId, organizationId, stayId: `stay-${id}` } });
  }
  await prisma.payment.create({ data: { id: "payment-b", organizationId: "org-b", propertyId: "prop-b", folioId: "folio-b", amount: 100, method: "CASH", receiptNo: "SYNTHETIC-B" } });
  await prisma.payment.create({ data: { id: "payment-a-other", organizationId: "org-a", propertyId: "prop-a", folioId: "folio-a-other", amount: 100, method: "CASH", receiptNo: "SYNTHETIC-A-OTHER" } });
  ownerCookie = (await login("owner")).cookie;
  agentCookie = (await login("agent")).cookie;
});
after(async () => { await prisma.$disconnect(); });

test("browser origin uses the incoming host when the server listens on all addresses", () => {
  const configured = process.env.APP_ORIGIN;
  delete process.env.APP_ORIGIN;
  try {
    const browserRequest = new Request("http://0.0.0.0:3001/api/v1/auth/verify", { method: "POST", headers: { Host: "localhost:3001", Origin: "http://localhost:3001", "Sec-Fetch-Site": "same-origin" } });
    assert.doesNotThrow(() => sessionModule.verifyRequestOrigin(browserRequest));
    assert.throws(() => sessionModule.verifyRequestOrigin(new Request(browserRequest.url, { method: "POST", headers: { Host: "localhost:3001", Origin: "https://attacker.invalid", "X-Forwarded-Host": "attacker.invalid" } })), /origin is not allowed/);
    assert.throws(() => sessionModule.verifyRequestOrigin(new Request(browserRequest.url, { method: "POST", headers: { Host: "localhost:3001", Origin: "null" } })), /origin is not allowed/);
    assert.throws(() => sessionModule.verifyRequestOrigin(new Request(browserRequest.url, { method: "POST", headers: { Host: "localhost:3001,attacker.invalid", Origin: "http://localhost:3001" } })), /origin is not allowed/);
  } finally {
    if (configured === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = configured;
  }
});

test("configured public origin takes precedence over request host", () => {
  const configured = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://hotel.example.invalid";
  try {
    const request = new Request("http://0.0.0.0:3001/api/v1/auth/verify", { method: "POST", headers: { Host: "localhost:3001", Origin: "https://hotel.example.invalid" } });
    assert.doesNotThrow(() => sessionModule.verifyRequestOrigin(request));
    assert.throws(() => sessionModule.verifyRequestOrigin(new Request(request.url, { method: "POST", headers: { Host: "localhost:3001", Origin: "http://localhost:3001" } })), /origin is not allowed/);
  } finally {
    if (configured === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = configured;
  }
});

test("password/PIN verification has no master or plaintext fallback", () => {
  const hash = passwordModule.hashPassword("unique-fixture-secret");
  assert.equal(passwordModule.verifyPassword("unique-fixture-secret",hash),true);
  assert.equal(passwordModule.verifyPassword("admin123",hash),false);
  assert.equal(passwordModule.verifyPassword("unique-fixture-secret","unique-fixture-secret"),false);
  assert.equal(passwordModule.verifyPassword("123456",null,"123456"),false);
  assert.equal(passwordModule.verifyPassword("123456",null,passwordModule.hashPassword("123456")),true);
  assert.equal(passwordModule.verifyPassword("x","bad:hash"),false);
});
test("login uses an opaque HttpOnly cookie and stores only its hash", async () => {
  const { response, cookie } = await login("agent");
  const header = response.headers.get("set-cookie")!;
  assert.match(header,/HttpOnly/i); assert.match(header,/SameSite=lax/i);
  const token = cookie.split("=")[1];
  assert.equal(token.length,64);
  const row = await prisma.userSession.findUniqueOrThrow({ where: { tokenHash: sessionModule.tokenHash(token) } });
  assert.notEqual(row.tokenHash,token);
  const body = await response.json(); assert.equal(body.token,undefined);
  agentCookie = cookie;
});
test("unknown and wrong-password accounts produce the same error", async () => {
  const { POST } = await import("../src/app/api/v1/auth/verify/route");
  const wrong = await POST(request("auth/verify","POST",{identifier:"owner@example.invalid",password:"wrong"}));
  const unknown = await POST(request("auth/verify","POST",{identifier:"absent@example.invalid",password:"wrong"}));
  assert.equal(wrong.status,401); assert.equal(unknown.status,401); assert.deepEqual(await wrong.json(),await unknown.json());
});
test("session lookup cannot select another identity or fall back to owner", async () => {
  const { GET } = await import("../src/app/api/v1/auth/session/route");
  assert.equal((await GET(request("auth/session?username=owner"))).status,401);
  const own = await GET(request("auth/session?username=other", "GET", undefined, agentCookie));
  assert.equal((await own.json()).user.id,"agent");
  assert.equal((await GET(request("auth/session?propertyId=prop-b","GET",undefined,ownerCookie))).status,403);
});
test("owner properties and staff directory are restricted to their organization", async () => {
  const { GET } = await import("../src/app/api/v1/admin/users/route");
  const response = await GET(request("admin/users","GET",undefined,ownerCookie));
  assert.equal(response.status,200);
  const body = await response.json();
  assert.deepEqual(body.properties.map((p:any)=>p.id).sort(),["prop-a","prop-a2"]);
  assert.equal(body.users.some((u:any)=>u.id === "other-owner"),false);
  assert.equal((await GET(request("admin/users","GET",undefined,agentCookie))).status,403);
});
test("property and record scope checks reject other organizations and ungranted hotels", async () => {
  for (const [route,cookie] of [["rooms?propertyId=prop-b",ownerCookie],["rooms?propertyId=prop-a2",agentCookie],["folios/folio-b",ownerCookie]]) {
    const result = await accessModule.authorizeRequest(request(route,"GET",undefined,cookie));
    assert.ok(result instanceof Response); assert.equal(result.status,403);
  }
});
test("public guest lookup cannot reveal another organization's guest", async () => {
  const { GET } = await import("../src/app/api/v1/guests/lookup/route");
  assert.equal((await GET(request("guests/lookup?phone=9000000002"))).status,401);
  const response = await GET(request("guests/lookup?phone=9000000002&propertyId=prop-a","GET",undefined,agentCookie));
  assert.equal(response.status,200); assert.equal((await response.json()).found,false);
});
test("cross-folio and cross-organization payment deletion are rejected before any write", async () => {
  const { DELETE } = await import("../src/app/api/v1/folios/[id]/payments/route");
  for (const paymentId of ["payment-b","payment-a-other"]) {
    const response = await DELETE(request(`folios/folio-a/payments?paymentId=${paymentId}`,"DELETE",undefined,ownerCookie),{params:Promise.resolve({id:"folio-a"})});
    assert.equal(response.status,403);
    assert.ok(await prisma.payment.findUnique({where:{id:paymentId}}));
  }
});
test("front desk agent cannot authorize refunds or disguise a JSON mutation", async () => {
  const refund = await accessModule.authorizeRequest(request("folios/folio-a/payments","POST",{amount:100,isRefund:true},agentCookie));
  assert.ok(refund instanceof Response); assert.equal(refund.status,403);
  const disguised = await accessModule.authorizeRequest(request("folios/folio-a/payments","POST",{amount:100,isRefund:true},agentCookie,{"Content-Type":"text/plain"}));
  assert.ok(disguised instanceof Response); assert.equal(disguised.status,415);
});
test("audit actor and property are derived from session, not JSON", async () => {
  const result = await accessModule.authorizeRequest(request("folios/folio-a/payments","POST",{amount:100,actorId:"forged",actorName:"Forged Owner"},agentCookie));
  assert.ok(!(result instanceof Response));
  const body = await result.request.json();
  assert.equal(body.actorId,"agent"); assert.equal(body.actorName,"agent"); assert.equal(body.organizationId,"org-a");
});
test("read-only access cannot waive a night or submit a disguised discount", async () => {
  const { cookie } = await login("viewer");
  const grace = await accessModule.authorizeRequest(request("folios/folio-a?graceMinutes=1440","GET",undefined,agentCookie));
  assert.ok(grace instanceof Response); assert.equal(grace.status,403);
  const discount = await accessModule.authorizeRequest(request("folios/folio-a/charges","POST",{amount:-50,chargeCode:"ROOM_TARIFF"},agentCookie));
  assert.ok(discount instanceof Response); assert.equal(discount.status,403);
});
test("new staff PINs are hashed and credential fields are omitted from responses", async () => {
  const { POST } = await import("../src/app/api/v1/admin/users/route");
  const response = await POST(request("admin/users","POST",{name:"Synthetic New Staff",username:"newstaff",roleId:"FD_AGENT",propertyIds:["prop-a"],pin:"234567"},ownerCookie));
  assert.equal(response.status,200);
  const body = await response.json(); assert.equal(body.user.pin,undefined); assert.equal(body.user.passwordHash,undefined);
  const stored = await prisma.user.findUniqueOrThrow({where:{id:body.user.id}});
  assert.ok(passwordModule.isPasswordHash(stored.pin)); assert.notEqual(stored.pin,"234567");
});
test("public property directory contains no staff, guest or financial data", async () => {
  const { GET } = await import("../src/app/api/v1/public/properties/route");
  const response = await GET(); assert.equal(response.status,200);
  const body = await response.json();
  for (const property of body.properties) { assert.equal(property.openingCashBalance,undefined); assert.equal(property.ownersJson,undefined); assert.equal(property.organizationId,undefined); }
  assert.equal(body.allUsers,undefined);
});
test("database-wide backups require ownership of all organizations", async () => {
  const { GET } = await import("../src/app/api/v1/admin/backups/route");
  assert.equal((await GET(request("admin/backups","GET",undefined,ownerCookie))).status,403);
});
test("cross-site requests and denied overrides cannot perform writes", async () => {
  const cross = await accessModule.authorizeRequest(request("folios/folio-a/payments","POST",{amount:100},agentCookie,{Origin:"https://attacker.invalid"}));
  assert.ok(cross instanceof Response); assert.equal(cross.status,403);
  const override = await prisma.permissionOverride.create({data:{userId:"agent",propertyId:"prop-a",permissionCode:"payment.collect",effect:"DENY"}});
  const denied = await accessModule.authorizeRequest(request("folios/folio-a/payments","POST",{amount:100},agentCookie));
  assert.ok(denied instanceof Response); assert.equal(denied.status,403);
  await prisma.permissionOverride.delete({where:{id:override.id}});
});
test("expired, revoked and suspended-account sessions are denied", async () => {
  for (const mode of ["expired","revoked","suspended"]) {
    const { cookie } = await login("viewer");
    const token = cookie.split("=")[1];
    if (mode === "expired") await prisma.userSession.update({where:{tokenHash:sessionModule.tokenHash(token)},data:{expiresAt:new Date(0)}});
    if (mode === "revoked") await prisma.userSession.update({where:{tokenHash:sessionModule.tokenHash(token)},data:{revokedAt:new Date()}});
    if (mode === "suspended") await prisma.user.update({where:{id:"viewer"},data:{status:"SUSPENDED"}});
    assert.equal(await sessionModule.getSession(request("auth/session","GET",undefined,cookie)),null);
    await prisma.user.update({where:{id:"viewer"},data:{status:"ACTIVE"}});
  }
});
test("every operational route rejects unauthenticated access before handling records", async () => {
  let checked = 0;
  function files(directory:string):string[] { return fs.readdirSync(directory,{withFileTypes:true}).flatMap((entry)=>entry.isDirectory()?files(path.join(directory,entry.name)):entry.name === "route.ts"?[path.join(directory,entry.name)]:[]); }
  for (const file of files(path.join(testRoot,"src/app/api/v1"))) {
    const route = path.relative(path.join(testRoot,"src/app/api/v1"),path.dirname(file)).replace(/\\/g,"/");
    if (["auth/verify","auth/session","public/properties"].includes(route)) continue;
    const module = await import(pathToFileURL(file).href);
    for (const method of ["GET","POST","PUT","PATCH","DELETE"]) {
      if (!module[method] || (route === "registrations" && method === "POST")) continue;
      const concrete = route.replace(/\[id\]/g,"synthetic-id").replace(/\[chargeId\]/g,"synthetic-charge");
      const response = await module[method](request(concrete,method,method === "GET" ? undefined : {}),{params:Promise.resolve({id:"synthetic-id",chargeId:"synthetic-charge"})});
      assert.equal(response.status,401,`${route} ${method}`); checked++;
    }
  }
  assert.ok(checked >= 90); console.log(`Verified ${checked} protected handler methods deny anonymous access`);
});
test("logout revokes server session and clears the cookie", async () => {
  const { DELETE, GET } = await import("../src/app/api/v1/auth/session/route");
  const response = await DELETE(request("auth/session","DELETE",undefined,ownerCookie));
  assert.equal(response.status,200); assert.match(response.headers.get("set-cookie")!,/Max-Age=0/i);
  assert.equal((await GET(request("auth/session","GET",undefined,ownerCookie))).status,401);
});
