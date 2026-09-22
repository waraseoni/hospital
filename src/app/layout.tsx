import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerRegistration } from "@/components/service-worker";

export const metadata: Metadata = {
  title: "Hospital Management System",
  description: "Clinic & Small Hospital Management Software",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");var a=localStorage.getItem("hms_accent");if(a)document.documentElement.dataset.accent=a}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
