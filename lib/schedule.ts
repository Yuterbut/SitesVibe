/**
 * Логика расписания NiKillya.
 *
 * Мастерская одна, постов два, мастер не выбирается — поэтому «свободно»
 * означает ровно одно: есть пост, у которого все получасовки под работу
 * не заняты.
 *
 * Время внутри считается в минутах от полуночи по часовому поясу мастерской,
 * а наружу отдаётся как UTC-инстанты. В России нет перехода на летнее время
 * с 2014 года, так что фиксированный сдвиг здесь безопасен и не требует
 * тянуть в проект базу часовых поясов.
 */

/** Шаг сетки записи. На двух постах более мелкий шаг даёт ложную точность. */
export const SLOT_MINUTES = 30;

/** Часовой пояс мастерской. МСК = 180. Менять здесь, если мастерская не в Москве. */
export const SHOP_TZ_OFFSET_MINUTES = 180;

/**
 * Рабочие часы. В опросе их не спрашивали — это допущение, которое нужно
 * подтвердить у владельца прежде, чем сайт станет публичным.
 */
export const WORK_START_MINUTES = 9 * 60;
export const WORK_END_MINUTES = 19 * 60;

/** Рабочие дни недели, 0 — воскресенье. По умолчанию понедельник–суббота. */
export const WORK_DAYS = [1, 2, 3, 4, 5, 6];

/** Сколько часов длится рабочий день. Столько занимает работа в режиме «машина остаётся». */
export const WORK_DAY_HOURS = (WORK_END_MINUTES - WORK_START_MINUTES) / 60;

const MS_PER_MINUTE = 60_000;

/** Дата в виде YYYY-MM-DD по времени мастерской. */
export type DayISO = string;

function assertDayISO(day: DayISO): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(`Ожидалась дата в формате YYYY-MM-DD, получено «${day}»`);
  }
}

/** Момент времени по календарю мастерской → UTC. */
export function shopTime(day: DayISO, minutesFromMidnight: number): Date {
  assertDayISO(day);
  const [y, m, d] = day.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  return new Date(
    utcMidnight + (minutesFromMidnight - SHOP_TZ_OFFSET_MINUTES) * MS_PER_MINUTE,
  );
}

/** Сколько минут прошло с полуночи по времени мастерской. */
export function toShopMinutes(at: Date): number {
  const shifted = new Date(at.getTime() + SHOP_TZ_OFFSET_MINUTES * MS_PER_MINUTE);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** Календарная дата мастерской для момента времени. */
export function shopDayISO(at: Date): DayISO {
  const shifted = new Date(at.getTime() + SHOP_TZ_OFFSET_MINUTES * MS_PER_MINUTE);
  return shifted.toISOString().slice(0, 10);
}

/** Рабочий ли это день. */
export function isWorkingDay(day: DayISO): boolean {
  assertDayISO(day);
  return WORK_DAYS.includes(shopTime(day, WORK_START_MINUTES + 1).getUTCDay());
}

/** Сколько получасовок занимает работа. */
export function slotCount(slotHours: number): number {
  const slots = (slotHours * 60) / SLOT_MINUTES;
  if (!Number.isInteger(slots) || slots <= 0) {
    throw new Error(`Длительность ${slotHours} ч не ложится на сетку в ${SLOT_MINUTES} минут`);
  }
  return slots;
}

/**
 * Получасовки, которые бронь занимает на посту. Именно они пишутся в SlotHold,
 * и именно уникальный индекс по ним не даёт записаться дважды.
 */
export function holdStarts(startAt: Date, slotHours: number): Date[] {
  return Array.from(
    { length: slotCount(slotHours) },
    (_, i) => new Date(startAt.getTime() + i * SLOT_MINUTES * MS_PER_MINUTE),
  );
}

/** Момент окончания работы. */
export function endOf(startAt: Date, slotHours: number): Date {
  return new Date(startAt.getTime() + slotHours * 60 * MS_PER_MINUTE);
}

/**
 * Все моменты дня, в которые работа такой длительности может начаться,
 * не вылезая за пределы рабочего дня. Занятость здесь ещё не учитывается.
 */
export function candidateStarts(day: DayISO, slotHours: number): Date[] {
  if (!isWorkingDay(day)) return [];

  const needed = slotCount(slotHours) * SLOT_MINUTES;
  const out: Date[] = [];
  for (
    let m = WORK_START_MINUTES;
    m + needed <= WORK_END_MINUTES;
    m += SLOT_MINUTES
  ) {
    out.push(shopTime(day, m));
  }
  return out;
}

/** Занятая получасовка: пост и момент её начала. */
export type Occupied = { bayId: number; slotStart: Date };

export type FreeStart = {
  /** Момент начала работы, UTC. */
  startAt: Date;
  /** Пост, на котором эта работа поместится. */
  bayId: number;
  /** Время по мастерской, для показа клиенту: «14:30». */
  label: string;
};

/** Время работы в виде HH:MM по мастерской. */
export function shopLabel(at: Date): string {
  const minutes = toShopMinutes(at);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Свободные варианты записи на день.
 *
 * Если работа помещается на оба поста, возвращается один вариант — клиенту
 * пост не показывается и не выбирается им, а берётся первый свободный.
 *
 * @param notBefore  моменты раньше него отбрасываются: нельзя записаться в прошлое.
 */
export function freeStarts(
  day: DayISO,
  slotHours: number,
  bayIds: number[],
  occupied: Occupied[],
  notBefore?: Date,
): FreeStart[] {
  const busy = new Set(
    occupied.map((o) => `${o.bayId}@${o.slotStart.getTime()}`),
  );

  const out: FreeStart[] = [];
  for (const startAt of candidateStarts(day, slotHours)) {
    if (notBefore && startAt.getTime() < notBefore.getTime()) continue;

    const needed = holdStarts(startAt, slotHours);
    const bayId = bayIds.find((id) =>
      needed.every((slot) => !busy.has(`${id}@${slot.getTime()}`)),
    );

    if (bayId !== undefined) {
      out.push({ startAt, bayId, label: shopLabel(startAt) });
    }
  }
  return out;
}

/**
 * Параметры брони для работы в режиме «машина остаётся»: клиент выбирает
 * только дату, а пост занимается на весь рабочий день.
 */
export function wholeDay(day: DayISO): { startAt: Date; slotHours: number } {
  return { startAt: shopTime(day, WORK_START_MINUTES), slotHours: WORK_DAY_HOURS };
}

/** Публичный код брони. Без похожих друг на друга символов — его диктуют по телефону. */
const CODE_ALPHABET = "ACDEFHJKLMNPQRTUVWXY34679";

export function generateCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}
