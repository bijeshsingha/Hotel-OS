import { currentSession, endSession } from "@/lib/auth/session-endpoints";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(request: Request) { return currentSession(request); }
export async function DELETE(request: Request) { return endSession(request); }
