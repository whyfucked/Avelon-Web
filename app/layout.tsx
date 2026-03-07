import type React from "react"
import type { Metadata } from "next"
import { Unbounded, Onest, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { ToastProvider } from "@/components/toast-provider"
import { SiteProtection } from "@/components/site-protection"
import { SnowEffect } from "@/components/snow-effect"
import { BackgroundLines } from "@/components/background-lines"
import { MaintenanceCheck } from "@/components/maintenance-check"
import "./globals.css"

const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], variable: "--font-unbounded" })
const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest" })
const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: "Avelon",
  description: "Быстрый и надёжный хостинг для ваших проектов",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${unbounded.variable} ${onest.variable} ${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <BackgroundLines />
          <SiteProtection />
          <SnowEffect />
          <MaintenanceCheck />
          {children}
          <ToastProvider />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
