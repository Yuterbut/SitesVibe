/**
 * Проверка того, что пришло из формы записи.
 *
 * Модуль намеренно не знает ни про базу, ни про Telegram: это чистые функции,
 * которые можно проверять тестами без поднятия чего-либо.
 */

import { z } from "zod";

/** VIN не содержит I, O и Q — их исключили, чтобы не путать с 1 и 0. */
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Российский номер в любой привычной записи. */
const PHONE_RE = /^(\+7|8|7)?[\s(-]*9\d{2}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}$/;

/** К единому виду +7XXXXXXXXXX — мастеру звонить, а не разбирать форматирование. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return `+7${digits.slice(-10)}`;
}

export const bookingInput = z.object({
  serviceId: z.string().min(1, "Не выбрана услуга"),
  /** Для работ с выбором времени — момент начала. Для «машина остаётся» — дата YYYY-MM-DD. */
  startAt: z.string().min(1, "Не выбрано время"),
  name: z.string().trim().min(2, "Как к вам обращаться?").max(60),
  phone: z
    .string()
    .trim()
    .regex(PHONE_RE, "Телефон вида +7 900 123-45-67")
    .transform(normalizePhone),
  vehicle: z.string().trim().min(2, "Укажите марку и модель").max(80),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || VIN_RE.test(v), "VIN — это 17 символов без букв I, O и Q")
    .optional()
    .or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  consent: z.literal(true, { message: "Без согласия отправить заявку нельзя" }),
});

export type BookingInput = z.infer<typeof bookingInput>;
