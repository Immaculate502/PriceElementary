import type React from "react"
import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
})

export const metadata: Metadata = {
  title: "ROOTED — Faith, Action, Ministry, Evangelism",
  description:
    "A spiritual development portal for growing deep roots in Faith, Action, Ministry, and Evangelism. Track disciplines, work through lessons, journal, submit prayer requests, and share testimonies.",
  generator: "v0.app",
  icons: {
    icon: "/rooted-icon.png",
    apple: "/rooted-icon.png",
  },
}

export const viewport: Viewport = {
  // Matches the deep forest green of the ROOTED emblem.
  themeColor: "#1a4732",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
