import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hospital Management System",
  description: "Clinic & Small Hospital Management Software",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
