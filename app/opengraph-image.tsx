import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/**
 * Картинка для превью ссылки в мессенджерах.
 *
 * Мастер будет кидать ссылку в Telegram и WhatsApp — там карточка ссылки
 * важнее, чем в поиске. Встроенный шрифт next/og кириллицу не знает,
 * поэтому Manrope лежит в репозитории и читается с диска.
 */
export const alt = "NiKillya — ремонт легковых автомобилей";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const font = await readFile(
    join(process.cwd(), "app", "fonts", "Manrope-ExtraBold.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#14110f",
          color: "#f5f0ea",
          padding: 72,
          fontFamily: "Manrope",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 8, color: "#d9a441" }}>
          NIKILLYA
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 78, lineHeight: 1.05, maxWidth: 900 }}>
            Ремонт легковых без сюрпризов в счёте
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#a1968a" }}>
            Запись онлайн · два поста · любые марки
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#a1968a",
          }}
        >
          <span>Пн–Сб, 09:00–19:00</span>
          <span style={{ color: "#d9a441" }}>Свободное время видно сразу</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Manrope", data: font, weight: 800, style: "normal" }],
    },
  );
}
