import { getAvailability } from "@/lib/availability";

/**
 * Свободное время на день.
 *
 * GET /api/availability?service=oil-engine&day=2026-08-24
 *
 * Занятость меняется каждую минуту, поэтому кешировать нельзя. В Next 16
 * GET-обработчики и так не кешируются по умолчанию, но здесь это важно
 * настолько, что стоит сказать явно.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("service");
  const day = searchParams.get("day");

  if (!serviceId || !day) {
    return Response.json(
      { error: "Нужны параметры service и day" },
      { status: 400 },
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return Response.json(
      { error: "Дата должна быть в формате YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const availability = await getAvailability(serviceId, day);
  if (!availability) {
    return Response.json({ error: "Такой услуги нет" }, { status: 404 });
  }

  return Response.json(availability);
}
