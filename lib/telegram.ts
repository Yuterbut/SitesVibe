/**
 * Отправка заявки мастеру в Telegram.
 *
 * Это единственное место в проекте, которое видит контакты клиента.
 * Ничего из этого не пишется в базу и не логируется: сообщение уходит
 * в личный чат мастера и живёт дальше только там.
 */

import { shopLabel } from "./schedule";

export type BookingMessage = {
  code: string;
  serviceName: string;
  startAt: Date;
  endAt: Date;
  wholeDay: boolean;
  name: string;
  phone: string;
  vehicle: string;
  vin?: string;
  note?: string;
  /** Подписанная ссылка, по которой мастер меняет статус. */
  masterUrl?: string;
};

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "not-configured" | "failed"; detail: string };

/** Telegram ломается на < > &, если не экранировать. */
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  weekday: "short",
  timeZone: "UTC",
});

/** Дата словами по календарю мастерской. */
function shopDateWords(at: Date, offsetMinutes: number): string {
  return DATE_FORMAT.format(new Date(at.getTime() + offsetMinutes * 60_000));
}

export function formatBookingMessage(
  m: BookingMessage,
  offsetMinutes: number,
): string {
  const when = m.wholeDay
    ? `${shopDateWords(m.startAt, offsetMinutes)}, машина остаётся на день`
    : `${shopDateWords(m.startAt, offsetMinutes)}, ${shopLabel(m.startAt)}–${shopLabel(m.endAt)}`;

  const lines = [
    `<b>Новая запись · ${escapeHtml(m.code)}</b>`,
    "",
    `🔧 ${escapeHtml(m.serviceName)}`,
    `🗓 ${escapeHtml(when)}`,
    `🚗 ${escapeHtml(m.vehicle)}`,
  ];

  if (m.vin) lines.push(`VIN: <code>${escapeHtml(m.vin)}</code>`);
  lines.push("", `${escapeHtml(m.name)} · <code>${escapeHtml(m.phone)}</code>`);
  if (m.note) lines.push("", `«${escapeHtml(m.note)}»`);
  // Ссылка на управление статусом — вместо админки, которой в проекте нет.
  if (m.masterUrl) lines.push("", `<a href="${escapeHtml(m.masterUrl)}">Управлять записью</a>`);

  return lines.join("\n");
}

/**
 * Уходит ли заявка вообще. Если бот не настроен, форма записи должна
 * показать прямой контакт, а не притворяться, что бронь принята.
 */
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendBooking(
  m: BookingMessage,
  offsetMinutes: number,
): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      ok: false,
      reason: "not-configured",
      detail: "TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы",
    };
  }

  // Базовый адрес вынесен в переменную окружения, чтобы сквозной путь
  // «форма → бронь → уведомление» можно было прогнать против мок-сервера,
  // не трогая настоящего бота.
  const base = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";

  try {
    const response = await fetch(
      `${base}/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: formatBookingMessage(m, offsetMinutes),
          parse_mode: "HTML",
        }),
        // Заявка не должна висеть, если Telegram недоступен: лучше быстро
        // сказать клиенту «напишите напрямую», чем держать его на спиннере.
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      // Тело ответа Telegram содержит только его собственную диагностику,
      // не данные клиента, поэтому его безопасно вернуть в лог.
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        reason: "failed",
        detail: `Telegram ответил ${response.status}: ${detail.slice(0, 200)}`,
      };
    }

    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: "failed", detail };
  }
}
