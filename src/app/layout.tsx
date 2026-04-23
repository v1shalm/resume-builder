import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// Update SITE_URL to match your deployment once you ship. The
// placeholder below lets `metadataBase` parse correctly during local
// development without hard-coding a production URL.
const SITE_URL = "https://resume-builder.vercel.app";
const SITE_TITLE = "Resume Builder — A tactile, keyboard-first résumé editor";
const SITE_DESC =
  "An open-source résumé builder with a live A4 preview, drag-and-drop sections, tactile audio feedback, and ATS-safe PDF export. Built with Next.js, React, and Tailwind.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s — Resume Builder",
  },
  description: SITE_DESC,
  keywords: [
    "resume builder",
    "CV builder",
    "open source resume builder",
    "A4 resume",
    "PDF resume",
    "ATS-safe resume",
    "Next.js resume builder",
    "react resume builder",
    "résumé",
  ],
  authors: [{ name: "Vishal Maurya", url: "https://github.com/v1shalm" }],
  creator: "Vishal Maurya",
  applicationName: "Resume Builder",
  category: "productivity",
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESC,
    siteName: "Resume Builder",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: SITE_TITLE,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    creator: "@v1shalm",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Next auto-registers src/app/icon.svg and src/app/apple-icon.tsx.
  // The OG image is served as a static asset from /public/og-image.png.
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2a30" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Apply the persisted theme class to <html> BEFORE React hydrates, so the
// page never flashes with the wrong palette. Defaults to dark when no
// preference is stored.
const themeBootstrap = `
(function() {
  try {
    var stored = JSON.parse(localStorage.getItem('resume-builder:theme') || 'null');
    var t = stored && stored.state && stored.state.theme ? stored.state.theme : 'dark';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {/*
          Preconnect to the font-preview hosts so the TLS handshake is
          already done by the time the user opens the font dropdown or
          swaps a theme font. Does nothing for visitors who never touch
          fonts (connections time out cheaply).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="anonymous" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
