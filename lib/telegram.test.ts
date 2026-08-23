import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizePhone } from "./validation";
import { SHOP_TZ_OFFSET_MINUTES, endOf, shopTime } from "./schedule";
import { formatBookingMessage } from "./telegram";

const MON = "2026-08-24";

function message(overrides: Partial<Parameters<typeof formatBookingMessage>[0]> = {}) {
  const startAt = shopTime(MON, 14 * 60);
  return formatBookingMessage(
    {
      code: "7N7L39",
      serviceName: "Замена тормозных колодок (одна ось)",
      startAt,
      endAt: endOf(startAt, 1.5),
      wholeDay: false,
      name: "Иван",
      phone: "+79001234567",
      vehicle: "Lada Vesta",
      ...overrides,
    },
    SHOP_TZ_OFFSET_MINUTES,
  );
}

describe("телефон", () => {
  it("приводит любые привычные записи к одному виду", () => {
    for (const raw of [
      "+7 900 123-45-67",
      "8 (900) 123-45-67",
      "79001234567",
      "8-900-123-45-67",
    ]) {
      assert.equal(normalizePhone(raw), "+79001234567");
    }
  });
});

describe("сообщение мастеру", () => {
  it("несёт всё, что нужно, чтобы перезвонить и подготовиться", () => {
    const text = message();
    assert.match(text, /7N7L39/, "код брони");
    assert.match(text, /Замена тормозных колодок/, "вид работ");
    assert.match(text, /14:00–15:30/, "время по мастерской");
    assert.match(text, /24 августа/, "дата словами");
    assert.match(text, /Lada Vesta/, "марка");
    assert.match(text, /\+79001234567/, "телефон");
  });

  it("для длинных работ пишет, что машина остаётся, вместо времени", () => {
    const text = message({ wholeDay: true, serviceName: "Замена сцепления" });
    assert.match(text, /машина остаётся на день/);
    assert.equal(/\d\d:\d\d–\d\d:\d\d/.test(text), false, "интервала быть не должно");
  });

  it("VIN и комментарий появляются только когда они есть", () => {
    assert.equal(/VIN/.test(message()), false);
    const withVin = message({ vin: "XTA210990Y2345678", note: "Стучит спереди справа" });
    assert.match(withVin, /VIN: <code>XTA210990Y2345678<\/code>/);
    assert.match(withVin, /Стучит спереди справа/);
  });

  it("экранирует разметку — иначе Telegram отвергнет сообщение", () => {
    const text = message({ vehicle: "Lada <b>Vesta</b> & Co" });
    assert.match(text, /Lada &lt;b&gt;Vesta&lt;\/b&gt; &amp; Co/);
    // Собственные теги сообщения при этом целы.
    assert.match(text, /<b>Новая запись/);
  });
});
