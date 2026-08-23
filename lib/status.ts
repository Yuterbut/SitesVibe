/**
 * Статусы брони: что видит клиент и что мастер может переключить.
 *
 * Значения хранятся строками, потому что SQLite не знает перечислений.
 * Этот модуль — единственный источник правды об их наборе и переходах.
 */

export const STATUSES = [
  "pending",
  "new",
  "confirmed",
  "in_progress",
  "done",
  "cancelled",
] as const;

export type Status = (typeof STATUSES)[number];

export function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

type Presentation = {
  /** Что видит клиент на странице статуса. */
  label: string;
  /** Пояснение человеческим языком — чтобы не гадать, что значит слово. */
  hint: string;
  /** Как подсветить: нейтрально, идёт работа, готово, отменено. */
  tone: "neutral" | "active" | "done" | "cancelled";
};

export const STATUS_VIEW: Record<Status, Presentation> = {
  pending: {
    label: "Оформляется",
    hint: "Заявка ещё не дошла до мастера. Если статус не изменится за пару минут, напишите напрямую.",
    tone: "neutral",
  },
  new: {
    label: "Заявка у мастера",
    hint: "Мастер получил запись и скоро перезвонит, чтобы подтвердить.",
    tone: "neutral",
  },
  confirmed: {
    label: "Подтверждена",
    hint: "Время за вами. Приезжайте к назначенному часу.",
    tone: "neutral",
  },
  in_progress: {
    label: "Машина в работе",
    hint: "Мастер занимается вашей машиной. Если понадобится что-то ещё — позвонит до начала работ.",
    tone: "active",
  },
  done: {
    label: "Готово",
    hint: "Работа закончена, машину можно забирать.",
    tone: "done",
  },
  cancelled: {
    label: "Отменена",
    hint: "Запись отменена, время освобождено.",
    tone: "cancelled",
  },
};

/** Кнопки, которые мастер видит для текущего статуса. */
export function nextStatuses(current: Status): Status[] {
  switch (current) {
    case "pending":
    case "new":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["in_progress", "cancelled"];
    case "in_progress":
      return ["done", "cancelled"];
    case "done":
    case "cancelled":
      // Дальше двигать некуда: закрытую бронь не воскрешаем, чтобы
      // случайное нажатие не заняло уже освободившееся время.
      return [];
  }
}

/** Освобождает ли этот статус пост. */
export function releasesSlot(status: Status): boolean {
  return status === "cancelled";
}
