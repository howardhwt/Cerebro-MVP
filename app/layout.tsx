import type { Metadata } from "next";
import { Syne, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display font - bold, geometric, memorable
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

// Body font - modern, highly readable
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

// Mono font - for data, metrics, technical info
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cerebro - Sales Intelligence OS",
  description: "Never forget what your customers need",
  icons: {
    icon: "/cerebro-logo.png",
    apple: "/cerebro-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
      </head>
      <body className={`${syne.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
