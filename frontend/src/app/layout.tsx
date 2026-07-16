import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedConnect India — Your AI-Powered Health Records",
  description:
    "Upload prescriptions, lab reports, and medical documents. Get AI-powered insights, health timeline, and doctor summaries.",
  keywords: [
    "health records",
    "India",
    "AI",
    "prescriptions",
    "lab reports",
    "medical documents",
    "ABDM",
    "Ayushman Bharat",
  ],
  authors: [{ name: "MedConnect India" }],
  openGraph: {
    title: "MedConnect India",
    description: "Your AI-Powered Personal Health Record Platform",
    type: "website",
  },
  icons: {
    icon: ["/favicon.ico", "/icon.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
