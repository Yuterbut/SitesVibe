import { db } from "./db";
import {
  SHOP_TZ_OFFSET_MINUTES,
  endOf,
  generateCode,
  holdStarts,
  isWorkingDay,
  shopDayISO,
  wholeDay,
} from "./schedule";
import { sendBooking } from "./telegram";
import { makeToken } from "./tokens";
import type { BookingInput } from "./validation";

export { bookingInput, normalizePhone, type BookingInput } from "./validation";

export type BookingResult =
  | { ok: true; code: string }
  | {
      ok: false;
      /** taken — слот заняли, пока клиент заполнял форму. */
      reason: "taken" | "unknown-service" | "closed" | "past" | "telegram";
      message: string;
    };

/** Адрес сайта для ссылок в сообщении мастеру. */
function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Уникальный индекс SlotHold нарушен — значит, слот заняли параллельно. */
function isSlotConflict(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "P2002";
}

/**
 * Создание брони.
 *
 * Порядок операций здесь важнее самой логики. Слот занимается ПЕРВЫМ, ещё
 * до отправки в Telegram: иначе двое одновременных клиентов получат
 * подтверждение на одно и то же время. А статус переводится в «new» только
 * ПОСЛЕ успешной отправки: иначе появится занятый слот, о котором мастер
 * не знает. Если отправка не удалась, бронь снимается целиком.
 */
export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) {
    return { ok: false, reason: "unknown-service", message: "Такой услуги нет" };
  }

  const isWholeDay = service.mode === "day";
  let startAt: Date;
  let slotHours: number;

  if (isWholeDay) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startAt)) {
      return { ok: false, reason: "past", message: "Не выбрана дата" };
    }
    ({ startAt, slotHours } = wholeDay(input.startAt));
  } else {
    startAt = new Date(input.startAt);
    if (Number.isNaN(startAt.getTime())) {
      return { ok: false, reason: "past", message: "Не выбрано время" };
    }
    slotHours = service.slotHours;
  }

  if (startAt.getTime() < Date.now()) {
    return { ok: false, reason: "past", message: "Это время уже прошло" };
  }
  if (!isWorkingDay(shopDayISO(startAt))) {
    return { ok: false, reason: "closed", message: "В этот день мастерская не работает" };
  }

  const endAt = endOf(startAt, slotHours);
  const slots = holdStarts(startAt, slotHours);
  const bays = await db.bay.findMany({ where: { active: true }, orderBy: { id: "asc" } });

  // Занимаем слот. Проверять занятость заранее бессмысленно — между проверкой
  // и записью успевает вклиниться параллельный запрос. Пусть решает индекс.
  let booking: { id: string; code: string } | null = null;

  for (const bay of bays) {
    for (let attempt = 0; attempt < 5 && !booking; attempt++) {
      const code = generateCode();
      try {
        booking = await db.$transaction(async (tx) => {
          const created = await tx.booking.create({
            data: {
              code,
              bayId: bay.id,
              serviceId: service.id,
              startAt,
              endAt,
              status: "pending",
            },
            select: { id: true, code: true },
          });
          await tx.slotHold.createMany({
            data: slots.map((slotStart) => ({
              bayId: bay.id,
              slotStart,
              bookingId: created.id,
            })),
          });
          return created;
        });
      } catch (error) {
        if (!isSlotConflict(error)) throw error;
        // Конфликт мог быть и по коду брони, и по слоту. Коды дешевле
        // перевыпустить, поэтому пробуем ещё раз на этом же посту, а если
        // не вышло за несколько попыток — уходим на следующий пост.
        if (attempt === 4) break;
      }
    }
    if (booking) break;
  }

  if (!booking) {
    return {
      ok: false,
      reason: "taken",
      message: "Это время только что заняли. Выберите другое.",
    };
  }

  const sent = await sendBooking(
    {
      code: booking.code,
      serviceName: service.name,
      startAt,
      endAt,
      wholeDay: isWholeDay,
      name: input.name,
      phone: input.phone,
      vehicle: input.vehicle,
      vin: input.vin || undefined,
      note: input.note || undefined,
      masterUrl: `${siteUrl()}/m/${makeToken(booking.id)}`,
    },
    SHOP_TZ_OFFSET_MINUTES,
  );

  if (!sent.ok) {
    // Слот освобождаем: занятая бронь, о которой мастер не знает, хуже,
    // чем честное «не получилось, напишите напрямую». Каскад снимет и holds.
    await db.booking.delete({ where: { id: booking.id } }).catch(() => {});
    console.error("[booking] уведомление не ушло:", sent.reason, sent.detail);
    return {
      ok: false,
      reason: "telegram",
      message: "Не удалось передать заявку мастеру. Напишите напрямую — контакт ниже.",
    };
  }

  await db.booking.update({
    where: { id: booking.id },
    data: { status: "new" },
  });

  return { ok: true, code: booking.code };
}
