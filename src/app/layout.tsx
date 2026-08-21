import type { Metadata } from "next";
import "./globals.css";
import { HotelProvider } from "@/lib/context/hotel-context";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "Hotel OS — Cloud Operating System",
  description:
    "Fast, minimal, and integrated PMS, POS, Folio & GST Invoicing, Housekeeping, and Night Audit for hospitality operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-zinc-100 antialiased selection:bg-blue-600 selection:text-white font-sans min-h-screen">
        <HotelProvider>
          <AppShell>{children}</AppShell>
        </HotelProvider>
      </body>
    </html>
  );
}
