import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earthquake Live",
  description: "A real-time visual dashboard for global earthquake activity using USGS open data.",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
