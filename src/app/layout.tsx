import type { Metadata, Viewport } from "next";
import { Baloo_2, Poppins } from "next/font/google";
import "./globals.css";
import { RegisterServiceWorker } from "./RegisterServiceWorker";

const baloo = Baloo_2({
  variable: "--font-baloo",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Turminha da Tata",
  description: "Sistema de gestão e acompanhamento da Turminha da Tata",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Turminha da Tata",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1FA787",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${baloo.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-poppins)]">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
