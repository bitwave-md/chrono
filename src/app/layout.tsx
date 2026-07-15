import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chrono — Bitwave workspace",
  description: "Self-hosted client project and time-tracking workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
