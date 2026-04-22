import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexión - Operational Clarity",
  description: "B2B platform for operational clarity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="font-inter bg-bg text-navy">{children}</body>
    </html>
  );
}
