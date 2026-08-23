import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Подписанные ссылки для мастера.
 *
 * Админки в проекте нет и не планируется, а статус ремонта кто-то должен
 * менять. Вместо логина мастеру уходит подписанная ссылка прямо в том же
 * сообщении с заявкой: чат личный, ссылка одноразово привязана к брони.
 *
 * Клиенту такая ссылка не нужна — он смотрит статус по короткому коду,
 * который ничего изменить не позволяет.
 */

function secret(): string {
  const value = process.env.BOOKING_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "BOOKING_SECRET не задан или короче 16 символов. Сгенерировать: openssl rand -hex 32",
    );
  }
  return value;
}

function sign(bookingId: string): string {
  return createHmac("sha256", secret()).update(bookingId).digest("base64url");
}

/** Токен вида <id>.<подпись>. */
export function makeToken(bookingId: string): string {
  return `${bookingId}.${sign(bookingId)}`;
}

/** Возвращает id брони, если подпись верна, иначе null. */
export function readToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const bookingId = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = sign(bookingId);

  // Длины должны совпасть до timingSafeEqual — иначе он бросит исключение.
  if (provided.length !== expected.length) return null;

  const ok = timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  return ok ? bookingId : null;
}
