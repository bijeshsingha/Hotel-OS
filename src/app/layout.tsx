import type { Metadata } from "next";
import "./globals.css";
import { HotelProvider } from "@/lib/context/hotel-context";
import { ThemeProvider } from "@/lib/context/theme-context";
import { AppShell } from "@/components/shell/app-shell";

export const metadata: Metadata = {
  title: "ROVESTA — Cloud Hotel Operating System",
  description:
    "Fast, minimal, and integrated PMS, POS, Folio & GST Invoicing, Housekeeping, and Night Audit for hospitality operations.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/brand/icon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/icon-192x192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 dark:bg-[#09090b] dark:text-zinc-100 antialiased selection:bg-blue-600 selection:text-white font-sans min-h-screen transition-colors duration-150">
        <ThemeProvider>
          <HotelProvider>
            <AppShell>{children}</AppShell>
          </HotelProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

