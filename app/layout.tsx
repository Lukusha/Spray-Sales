import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crystal Care — ჭაღის საწმენდი სპრეი",
  description: "YYLFD 100 მლ — 24.95 ₾. გადახდა მიღებისას.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ka">
      <body className="antialiased">{children}</body>
    </html>
  );
}
