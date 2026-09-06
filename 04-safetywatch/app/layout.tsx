import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"SafetyWatch — FDA Recall Dashboard", description:"Explore food, drug, and medical-device recalls using public FDA enforcement data.", other:{"codex-preview":"development"}, icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
