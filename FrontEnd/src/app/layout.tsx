import { ThemeProvider } from "@/components/theme-provider";
import { themeBootstrap } from "@/lib/theme";
import { AppFooter } from "@/components/app-footer";
import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "سامانه آزمون دانشگاه",
  description: "پنل دانشجویی آزمون‌های دانشگاه",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <AppFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
