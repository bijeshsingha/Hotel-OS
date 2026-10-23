import { prisma } from "@/lib/db/prisma";
const aliases: Record<string, string> = {
  bijesh: "bijesh.singha@hotelos.in",
  bijesh_singha: "bijesh.singha@hotelos.in",
  admin: "bijesh.singha@hotelos.in",

  atanu: "atanu.chowdhury@hotelos.internal",
  atanu_chowdhury: "atanu.chowdhury@hotelos.internal",
  general_manager: "atanu.chowdhury@hotelos.internal",

  frontdesk: "reservation.ambarish@hotelos.internal",
  ambarish_frontdesk: "reservation.ambarish@hotelos.internal",
  ambarish_reception: "reservation.ambarish@hotelos.internal",
  suraj: "reservation.ambarish@hotelos.internal",
  alex: "reservation.ambarish@hotelos.internal",
  "reservation.ambarish": "reservation.ambarish@hotelos.internal",

  "reception.divine": "reception.divine@hotelos.internal",
  divine_frontdesk: "reception.divine@hotelos.internal",
  divine_reception: "reception.divine@hotelos.internal",
  das: "reception.divine@hotelos.internal",
};
export function reservedLoginHandles(): string[] { return Object.keys(aliases); }
export async function findLoginUser(identifier: string) {
  const clean = identifier.trim().toLowerCase();
  const exactEmail = aliases[clean] || (clean.includes("@") ? clean : `${clean}@hotelos.internal`);
  return prisma.user.findFirst({ where: { OR: [{ email: exactEmail }, { id: identifier.trim() }] } });
}
export function usernameFor(email: string) {
  const alias = Object.entries(aliases).find(([name, address]) => address === email && (name.includes("_") || name === "reception.divine"));
  return alias?.[0] || (email.endsWith("@hotelos.internal") ? email.replace("@hotelos.internal", "") : email.split("@")[0]);
}
