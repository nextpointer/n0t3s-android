import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme-provider";
import type { Viewport } from "next";
import { StorageInit } from "@/components/StorageInit";
import { AndroidBackButton } from "@/components/AndroidBackButton";
import { NativeLinks } from "@/components/NativeLinks";
import { ExitConfirmSheet } from "@/components/ExitConfirmSheet";

export const metadata: Metadata = {
  title: "N0T3S",
  description: "A simple, fast and minimal note-taking app",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        url: "/android-chrome-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        rel: "icon",
        url: "/android-chrome-512x512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
  },
};

export const viewport: Viewport = {
  // Track the system theme so the status-bar/browser chrome around the app
  // never shows a stale grey strip (especially visible on Android).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101014" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents iOS from zooming in on input focus
  interactiveWidget: "resizes-content",
};

const sg = Space_Grotesk({
  subsets: ["latin"],
});

const sm = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--space-mono",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sm.variable} overflow-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <StorageInit />
          <AndroidBackButton />
          <NativeLinks />
          <ExitConfirmSheet />
          <main
            className={`flex h-[100dvh] w-full justify-center items-center flex-col gap-2 overflow-hidden ${sg.className} `}
          >
            {children}
            <Toaster
              toastOptions={{
                className: "text-sm",
                style: {
                  background: "var(--background)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                },

                iconTheme: {
                  primary: "var(--foreground)",
                  secondary: "var(--background)",
                },
              }}
            />
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
