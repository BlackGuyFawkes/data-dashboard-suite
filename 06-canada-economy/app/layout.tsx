import type{Metadata}from"next";import"./globals.css";
export const metadata:Metadata={title:"Canada Economy Dashboard",description:"Track Canadian growth, inflation, employment, interest rates, bonds and currency using official public data.",other:{"codex-preview":"development"},icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en-CA"><body>{children}</body></html>}
