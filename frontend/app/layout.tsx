import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";

/**
 * Poppins is the primary font, loaded at runtime via the Google Fonts <link>
 * tags below (build-time font fetching is unavailable in this environment).
 * Until the stylesheet loads, globals.css falls back to Inter/Segoe UI/Roboto.
 */
export const metadata: Metadata = {
  title: "Apex ERP",
  description: "Apex ERP dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      <body className="h-full overflow-hidden">
        <TooltipProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
