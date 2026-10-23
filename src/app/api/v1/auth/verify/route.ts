import { verifyLogin } from "@/lib/auth/login";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function POST(request: Request) { return verifyLogin(request); }
