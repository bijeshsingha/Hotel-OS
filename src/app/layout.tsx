import type { Metadata } from "next";
import "./globals.css";
import { HotelProvider } from "@/lib/context/hotel-context";
import { ThemeProvider } from "@/lib/context/theme-context";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('hotelos-theme') || 'light';
                if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.setAttribute('data-theme', 'light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
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
