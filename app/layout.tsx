import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./provider";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});


const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Home | Scrapify",
  description:
    "Create and manage browser automations with Scrapify. Turn everyday web tasks into repeatable workflows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${playfair.variable}  h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
        {children}
        </Providers>
        </body>
    </html>
  );
}