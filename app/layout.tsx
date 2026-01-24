import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
