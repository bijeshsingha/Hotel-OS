import { prisma } from "@/lib/db/prisma";

/**
 * Returns the configured default property ID from environment variables.
 */
export function getSelectedPropertyIdFromEnv(): string | null {
  return process.env.SELECTED_HOTEL_ID || process.env.NEXT_PUBLIC_DEFAULT_PROPERTY_ID || null;
}

/**
 * Returns the configured default property Code from environment variables.
 */
export function getSelectedPropertyCodeFromEnv(): string | null {
  return process.env.SELECTED_HOTEL_CODE || process.env.NEXT_PUBLIC_DEFAULT_PROPERTY_CODE || null;
}

/**
 * Resolves the target property based on:
 * 1. Explicitly requested ID (if provided)
 * 2. SELECTED_HOTEL_ID from .env
 * 3. SELECTED_HOTEL_CODE from .env
 * 4. First available property in the database
 */
export async function resolveSelectedProperty(requestedId?: string | null) {
  if (requestedId) {
    const prop = await prisma.property.findUnique({
      where: { id: requestedId },
    });
    if (prop) return prop;
  }

  const envId = getSelectedPropertyIdFromEnv();
  if (envId) {
    const prop = await prisma.property.findUnique({
      where: { id: envId },
    });
    if (prop) return prop;
  }

  const envCode = getSelectedPropertyCodeFromEnv();
  if (envCode) {
    const prop = await prisma.property.findFirst({
      where: {
        code: {
          equals: envCode,
        },
      },
    });
    if (prop) return prop;
  }

  // Fallback to the first property
  return await prisma.property.findFirst({
    orderBy: { createdAt: "asc" },
  });
}
