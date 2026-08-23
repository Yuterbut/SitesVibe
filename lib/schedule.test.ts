import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SHOP_TZ_OFFSET_MINUTES,
  WORK_DAY_HOURS,
  candidateStarts,
  endOf,
  freeStarts,
  generateCode,
  holdStarts,
  isWorkingDay,
  shopDayISO,
  shopLabel,
  shopTime,
  slotCount,
  toShopMinutes,
  wholeDay,
} from "./schedule";

// 2026-08-24 — понедельник. 2026-08-23 — воскресенье.
const MON = "2026-08-24";
const SUN = "2026-08-23";
const BAYS = [1, 2];

describe("время мастерской", () => {
  it("переводит местное время в UTC с учётом сдвига", () => {
    const at = shopTime(MON, 14 * 60);
    assert.equal(at.toISOString(), "2026-08-24T11:00:00.000Z");
    assert.equal(SHOP_TZ_OFFSET_MINUTES, 180);
  });

  it("переводит обратно без потерь", () => {
    for (const minutes of [0, 9 * 60, 13 * 60 + 30, 18 * 60 + 30]) {
      const at = shopTime(MON, minutes);
      assert.equal(toShopMinutes(at), minutes);
    }
  });

  it("определяет календарный день мастерской, а не UTC", () => {
    // 09:00 по мастерской — это ещё 06:00 UTC того же дня.
    assert.equal(shopDayISO(shopTime(MON, 9 * 60)), MON);
    // 01:00 по мастерской — это 22:00 UTC предыдущих суток, но день тот же.
    assert.equal(shopDayISO(shopTime(MON, 60)), MON);
  });

  it("подписывает слот временем мастерской", () => {
    assert.equal(shopLabel(shopTime(MON, 9 * 60)), "09:00");
    assert.equal(shopLabel(shopTime(MON, 14 * 60 + 30)), "14:30");
  });

  it("отвергает дату не в формате YYYY-MM-DD", () => {
    assert.throws(() => shopTime("24.08.2026", 600), /YYYY-MM-DD/);
  });
});

describe("рабочие дни", () => {
  it("понедельник рабочий, воскресенье нет", () => {
    assert.equal(isWorkingDay(MON), true);
    assert.equal(isWorkingDay(SUN), false);
  });

  it("в выходной вариантов записи нет вообще", () => {
    assert.deepEqual(candidateStarts(SUN, 1), []);
  });
});

describe("сетка", () => {
  it("считает получасовки", () => {
    assert.equal(slotCount(0.5), 1);
    assert.equal(slotCount(1), 2);
    assert.equal(slotCount(2.5), 5);
  });

  it("отвергает длительность мимо сетки", () => {
    assert.throws(() => slotCount(0.7), /не ложится на сетку/);
    assert.throws(() => slotCount(0), /не ложится на сетку/);
  });

  it("раскладывает бронь в непрерывную цепочку получасовок", () => {
    const holds = holdStarts(shopTime(MON, 10 * 60), 1.5);
    assert.equal(holds.length, 3);
    assert.deepEqual(
      holds.map(shopLabel),
      ["10:00", "10:30", "11:00"],
    );
  });

  it("считает конец работы", () => {
    assert.equal(shopLabel(endOf(shopTime(MON, 10 * 60), 2.5)), "12:30");
  });
});

describe("варианты начала", () => {
  it("первый вариант в начале дня, последний — чтобы успеть до закрытия", () => {
    const starts = candidateStarts(MON, 1);
    assert.equal(shopLabel(starts[0]), "09:00");
    assert.equal(shopLabel(starts[starts.length - 1]), "18:00");
  });

  it("длинная работа сдвигает последний вариант раньше", () => {
    const starts = candidateStarts(MON, 4);
    assert.equal(shopLabel(starts[starts.length - 1]), "15:00");
  });

  it("работа длиннее рабочего дня не помещается никуда", () => {
    assert.deepEqual(candidateStarts(MON, WORK_DAY_HOURS + 0.5), []);
  });

  it("работа ровно в рабочий день помещается единственным вариантом", () => {
    const starts = candidateStarts(MON, WORK_DAY_HOURS);
    assert.equal(starts.length, 1);
    assert.equal(shopLabel(starts[0]), "09:00");
  });
});

describe("свободные слоты", () => {
  it("на пустом дне свободно всё, и всё уходит на первый пост", () => {
    const free = freeStarts(MON, 1, BAYS, []);
    assert.equal(free.length, candidateStarts(MON, 1).length);
    assert.ok(free.every((f) => f.bayId === 1));
  });

  it("занятый первый пост уводит клиента на второй, а не прячет время", () => {
    const occupied = holdStarts(shopTime(MON, 10 * 60), 1).map((slotStart) => ({
      bayId: 1,
      slotStart,
    }));
    const free = freeStarts(MON, 1, BAYS, occupied);
    const at10 = free.find((f) => f.label === "10:00");
    assert.ok(at10, "10:00 должно остаться доступным");
    assert.equal(at10.bayId, 2);
  });

  it("когда оба поста заняты, время исчезает из выдачи", () => {
    const occupied = BAYS.flatMap((bayId) =>
      holdStarts(shopTime(MON, 10 * 60), 1).map((slotStart) => ({ bayId, slotStart })),
    );
    const free = freeStarts(MON, 1, BAYS, occupied);
    assert.equal(free.some((f) => f.label === "10:00"), false);
    // Соседние получасовки при этом свободны.
    assert.ok(free.some((f) => f.label === "09:00"));
  });

  it("частичное пересечение тоже блокирует: длинная работа не влезает в щель", () => {
    // Заняты 10:30–11:00 на обоих постах. Двухчасовая работа с 10:00 задела бы их.
    const occupied = BAYS.flatMap((bayId) => [
      { bayId, slotStart: shopTime(MON, 10 * 60 + 30) },
    ]);
    const free = freeStarts(MON, 2, BAYS, occupied);
    assert.equal(free.some((f) => f.label === "10:00"), false);
    assert.equal(free.some((f) => f.label === "09:00"), false, "09:00–11:00 тоже задевает");
    assert.ok(free.some((f) => f.label === "11:00"), "после занятого — свободно");
  });

  it("не предлагает записаться в прошлое", () => {
    const free = freeStarts(MON, 1, BAYS, [], shopTime(MON, 13 * 60));
    assert.equal(free.some((f) => f.label === "12:30"), false);
    assert.equal(free[0].label, "13:00");
  });

  it("на одном посту вторая параллельная запись невозможна", () => {
    const occupied = holdStarts(shopTime(MON, 12 * 60), 1).map((slotStart) => ({
      bayId: 1,
      slotStart,
    }));
    const free = freeStarts(MON, 1, [1], occupied);
    assert.equal(free.some((f) => f.label === "12:00"), false);
    assert.equal(free.some((f) => f.label === "12:30"), false);
  });
});

describe("режим «машина остаётся»", () => {
  it("занимает пост на весь рабочий день", () => {
    const { startAt, slotHours } = wholeDay(MON);
    assert.equal(shopLabel(startAt), "09:00");
    assert.equal(slotHours, WORK_DAY_HOURS);
    assert.equal(shopLabel(endOf(startAt, slotHours)), "19:00");
  });

  it("после такой брони на посту не остаётся ничего", () => {
    const { startAt, slotHours } = wholeDay(MON);
    const occupied = holdStarts(startAt, slotHours).map((slotStart) => ({
      bayId: 1,
      slotStart,
    }));
    const free = freeStarts(MON, 0.5, [1], occupied);
    assert.deepEqual(free, []);
  });
});

describe("код брони", () => {
  it("шесть символов без похожих друг на друга", () => {
    const code = generateCode();
    assert.match(code, /^[ACDEFHJKLMNPQRTUVWXY34679]{6}$/);
    // Ноль, О, единица, I и S исключены — код диктуют по телефону.
    assert.equal(/[0O1IL8B5S2Z]/.test(code), false);
  });

  it("детерминирован при заданном источнике случайности", () => {
    assert.equal(generateCode(() => 0), "AAAAAA");
  });
});
