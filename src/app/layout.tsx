import type { Metadata } from "next";
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import Providers from "./Providers";

export const metadata: Metadata = {
  title: "X Clone",
  description: "A clone of X.com built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={GeistMono.className}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
