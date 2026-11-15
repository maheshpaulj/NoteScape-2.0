import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProviderWrapper } from "@/components/Providers/ClerkProviderWrapper";
import { ThemeProvider } from "@/components/Providers/ThemeProvider";
import { Analytics } from "@vercel/analytics/react"

import { Toaster } from "sonner";
import { ModalProvider } from "@/components/Providers/ModalProvider";
import { FirebaseAuthProvider } from "@/components/Providers/FirebaseAuthProvider";
import { EdgeStoreProvider } from "@/lib/edgestore";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1F1F1F" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://notescape.vercel.app"
  ),
  title: "NoteScape - AI-Powered Note-Taking Application",
  description: "Transform your note-taking experience with NoteScape's AI-powered features including real-time collaboration, smart translation, and context-aware Q&A. Built with Next.js and Meta's Llama model.",
  keywords: "note-taking, AI, collaboration, Llama model, real-time, translation, Next.js",
  manifest: "/manifest.json",
    icons: {
    icon: [
      {
        url: "/images/icons/Icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/images/icons/Icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: "NoteScape - AI-Powered Note-Taking Application",
    description: "Transform your note-taking experience with NoteScape's AI-powered features including real-time collaboration, smart translation, and context-aware Q&A.",
    type: "website",
    locale: "en_US",
    siteName: "NoteScape",
    images: [
      {
        url: "/assets/ss.png", // You'll need to add your actual OG image
        width: 1200,
        height: 630,
        alt: "NoteScape Preview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "NoteScape - AI-Powered Note-Taking Application",
    description: "Transform your note-taking experience with NoteScape's AI-powered features including real-time collaboration, smart translation, and context-aware Q&A.",
    images: ["/assets/ss.png"], // You'll need to add your actual Twitter card image
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="notescape-theme">
          <ClerkProviderWrapper>
            <FirebaseAuthProvider>
              <EdgeStoreProvider>
                <Toaster position="bottom-right" />
                <ModalProvider />
                <ServiceWorkerRegistrar />
                {children}
              </EdgeStoreProvider>
            </FirebaseAuthProvider>
          </ClerkProviderWrapper>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
