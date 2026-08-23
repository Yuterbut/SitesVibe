"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { isStatus, releasesSlot } from "@/lib/status";
import { readToken } from "@/lib/tokens";

export type ActionResult = { error?: string };

/**
 * Смена статуса мастером.
 *
 * Право на изменение даёт только подпись в ссылке — она уходит мастеру
 * в личный чат вместе с заявкой. Никаких сессий и паролей: заводить их
 * ради одного человека дороже, чем польза.
 */
export async function setStatus(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "");
  const next = String(formData.get("status") ?? "");

  const bookingId = readToken(token);
  if (!bookingId) return { error: "Ссылка недействительна" };
  if (!isStatus(next)) return { error: "Неизвестный статус" };

  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return { error: "Запись не найдена" };

  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: next } });

    // Отмена возвращает время в продажу. «Готово» — нет: работа заняла
    // этот слот по факту, и переоткрывать его задним числом неправильно.
    if (releasesSlot(next)) {
      await tx.slotHold.deleteMany({ where: { bookingId } });
    }
  });

  revalidatePath(`/m/${token}`);
  revalidatePath(`/z/${booking.code}`);
  return {};
}
