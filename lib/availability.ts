import { db } from "./db";
import {
  type DayISO,
  WORK_END_MINUTES,
  WORK_START_MINUTES,
  freeStarts,
  isWorkingDay,
  shopTime,
  slotCount,
  wholeDay,
} from "./schedule";

export type DayAvailability = {
  day: DayISO;
  /** true — клиент выбирает только дату, машина остаётся на день. */
  wholeDay: boolean;
  /** Варианты времени. Для режима «машина остаётся» — пустой при занятости. */
  starts: { at: string; label: string }[];
  /** Свободен ли день целиком, для режима «машина остаётся». */
  dayFree: boolean;
};

/** Все занятые получасовки в пределах рабочего дня. */
async function occupiedOn(day: DayISO) {
  const from = shopTime(day, WORK_START_MINUTES);
  const to = shopTime(day, WORK_END_MINUTES);
  const holds = await db.slotHold.findMany({
    where: { slotStart: { gte: from, lt: to } },
    select: { bayId: true, slotStart: true },
  });
  return holds;
}

export async function getAvailability(
  serviceId: string,
  day: DayISO,
): Promise<DayAvailability | null> {
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return null;

  const empty: DayAvailability = {
    day,
    wholeDay: service.mode === "day",
    starts: [],
    dayFree: false,
  };

  if (!isWorkingDay(day)) return empty;

  const bays = await db.bay.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });
  const bayIds = bays.map((b) => b.id);
  const occupied = await occupiedOn(day);

  if (service.mode === "day") {
    // Машина остаётся: нужен пост, на котором в этот день не занято ничего.
    const busyBays = new Set(occupied.map((o) => o.bayId));
    const dayFree = bayIds.some((id) => !busyBays.has(id));
    const { startAt } = wholeDay(day);
    return {
      ...empty,
      dayFree,
      starts: dayFree ? [{ at: startAt.toISOString(), label: "весь день" }] : [],
    };
  }

  // Записаться на сегодня можно, но не в час, который уже наступил.
  const free = freeStarts(day, service.slotHours, bayIds, occupied, new Date());

  return {
    ...empty,
    dayFree: free.length > 0,
    starts: free.map((f) => ({ at: f.startAt.toISOString(), label: f.label })),
  };
}

/** Сколько получасовок займёт услуга — для показа «работа займёт N часов». */
export function slotsForHours(slotHours: number): number {
  return slotCount(slotHours);
}
