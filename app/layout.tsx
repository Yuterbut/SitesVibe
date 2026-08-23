import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Unbounded } from "next/font/google";

import { siteUrl } from "@/lib/site";

import "./globals.css";

// Кириллица обязательна: без подмножества cyrillic браузер молча подставит
// системный шрифт, и вся типографика развалится.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  display: "swap",
});

const DESCRIPTION =
  "Два поста, честные сроки и понятная цена. Запись онлайн: выбираете работу и время, мастер получает заявку сразу.";

export const metadata: Metadata = {
  // Нужен, чтобы относительные адреса картинок превью превратились в полные.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "NiKillya — ремонт легковых автомобилей",
    template: "%s — NiKillya",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "NiKillya",
    title: "NiKillya — ремонт легковых автомобилей",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "NiKillya — ремонт легковых автомобилей",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#14110f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${unbounded.variable} ${manrope.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
