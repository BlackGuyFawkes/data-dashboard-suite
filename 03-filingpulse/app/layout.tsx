import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "FilingPulse — SEC Intelligence Dashboard", description: "Visualize company filings and financial trends using live SEC EDGAR data.", other: { "codex-preview": "development" }, icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
