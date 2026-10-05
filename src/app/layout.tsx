import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";

const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "J&K Conflict Atlas, 1947 to present",
  description:
    "A sourced, interactive record of terrorist attacks, massacres, wars and India's response in Jammu & Kashmir and Ladakh since 1947.",
};

export const viewport: Viewport = { themeColor: "#07080a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteNav />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
