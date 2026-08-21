import { NextResponse } from "next/server";
import os from "os";

export async function GET() {
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

  return NextResponse.json({
    primaryIp,
    addresses,
    localUrl: "http://localhost:3000",
    networkUrl: `http://${primaryIp}:3000`,
    checkinNetworkUrl: `http://${primaryIp}:3000/checkin`,
  });
}
