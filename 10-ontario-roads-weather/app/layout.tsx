import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ontario Roads & Weather",
  description: "A visual Ontario travel dashboard for road incidents, surface conditions, visibility, and weather.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
