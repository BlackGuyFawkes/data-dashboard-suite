import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"SalaryScope — Wage & Employment Dashboard",description:"Explore U.S. wages, employment and labor-market trends using public BLS data.",other:{"codex-preview":"development"},icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}
