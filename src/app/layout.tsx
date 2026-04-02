import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Joda Company - Gestion des Bourses',
  description: 'Plateforme de gestion des bourses d\'études en Chine',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}