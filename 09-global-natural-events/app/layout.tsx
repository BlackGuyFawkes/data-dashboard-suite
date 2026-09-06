import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Global Natural Events",
  description: "A visual dashboard for monitoring wildfires, storms, volcanoes, floods, and other natural events worldwide.",
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
