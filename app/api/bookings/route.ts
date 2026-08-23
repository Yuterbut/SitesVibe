import { createBooking } from "@/lib/booking";
import { bookingInput } from "@/lib/validation";

/**
 * Приём заявки.
 *
 * POST /api/bookings
 *
 * Тело запроса содержит контакты клиента и НЕ ДОЛЖНО попадать ни в логи,
 * ни в аналитику: имя, телефон и VIN уходят только мастеру в Telegram.
 * Поэтому ниже нигде нет console.log(body) — и не должно появиться.
 */
export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Ожидался JSON" }, { status: 400 });
  }

  const parsed = bookingInput.safeParse(raw);
  if (!parsed.success) {
    // Наружу отдаём только сообщения об ошибках и имена полей — без значений.
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fields[key] ??= issue.message;
    }
    return Response.json({ error: "Проверьте поля", fields }, { status: 400 });
  }

  const result = await createBooking(parsed.data);

  if (!result.ok) {
    // 409 — слот заняли параллельно, клиенту нужно выбрать другое время.
    // 503 — Telegram недоступен, заявку принять физически некуда.
    const status =
      result.reason === "taken" ? 409 : result.reason === "telegram" ? 503 : 400;
    return Response.json(
      { error: result.message, reason: result.reason },
      { status },
    );
  }

  return Response.json({ code: result.code }, { status: 201 });
}
