import { NextResponse } from "next/server";
import os from "os";

export async function GET(request: Request) {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  const primaryIp = addresses.find((ip) => ip.startsWith("192.168.")) || addresses[0] || "127.0.0.1";
  const host = request.headers.get("host") || "localhost:3000";
  const port = host.includes(":") ? host.split(":")[1] : (process.env.PORT || "3000");

  return NextResponse.json({
    primaryIp,
    addresses,
    port,
    localUrl: `http://localhost:${port}`,
    networkUrl: `http://${primaryIp}:${port}`,
    checkinNetworkUrl: `http://${primaryIp}:${port}/checkin`,
  });
}
