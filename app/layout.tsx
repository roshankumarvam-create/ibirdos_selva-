import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "iBirdOS",
  description: "Kitchen Intelligence System",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}