import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { makeToken, readToken } from "./tokens";
import { STATUSES, isStatus, nextStatuses, releasesSlot } from "./status";

describe("подписанные ссылки мастера", () => {
  before(() => {
    process.env.BOOKING_SECRET = "0123456789abcdef0123456789abcdef";
  });

  it("свой токен читается обратно", () => {
    const token = makeToken("clx123abc");
    assert.equal(readToken(token), "clx123abc");
  });

  it("подделанная подпись отвергается", () => {
    const token = makeToken("clx123abc");
    const tampered = token.slice(0, -1) + (token.at(-1) === "A" ? "B" : "A");
    assert.equal(readToken(tampered), null);
  });

  it("подменённый id отвергается — иначе чужую бронь можно было бы закрыть", () => {
    const token = makeToken("clx123abc");
    const signature = token.slice(token.lastIndexOf(".") + 1);
    assert.equal(readToken(`clxOTHER.${signature}`), null);
  });

  it("мусор вместо токена не роняет приложение", () => {
    for (const junk of ["", ".", "нет-точки", "a.", ".b"]) {
      assert.equal(readToken(junk), null);
    }
  });

  it("токен зависит от секрета", () => {
    const token = makeToken("clx123abc");
    process.env.BOOKING_SECRET = "ffffffffffffffffffffffffffffffff";
    assert.equal(readToken(token), null);
    process.env.BOOKING_SECRET = "0123456789abcdef0123456789abcdef";
  });

  it("без секрета отказывается работать, а не подписывает пустотой", () => {
    const saved = process.env.BOOKING_SECRET;
    process.env.BOOKING_SECRET = "коротко";
    assert.throws(() => makeToken("clx123abc"), /BOOKING_SECRET/);
    process.env.BOOKING_SECRET = saved;
  });
});

describe("статусы", () => {
  it("узнаёт свои значения и отвергает чужие", () => {
    assert.equal(isStatus("in_progress"), true);
    assert.equal(isStatus("готово"), false);
  });

  it("каждый статус ведёт куда-то или является конечным", () => {
    for (const s of STATUSES) {
      const next = nextStatuses(s);
      assert.ok(Array.isArray(next));
      assert.ok(next.every(isStatus), `${s} предлагает несуществующий статус`);
    }
  });

  it("отмена доступна на каждом живом шаге", () => {
    for (const s of ["pending", "new", "confirmed", "in_progress"] as const) {
      assert.ok(nextStatuses(s).includes("cancelled"), `из ${s} нельзя отменить`);
    }
  });

  it("закрытая бронь никуда не двигается", () => {
    assert.deepEqual(nextStatuses("done"), []);
    assert.deepEqual(nextStatuses("cancelled"), []);
  });

  it("пост освобождает только отмена", () => {
    assert.equal(releasesSlot("cancelled"), true);
    // «Готово» пост не освобождает: работа заняла это время по факту.
    assert.equal(releasesSlot("done"), false);
    assert.equal(releasesSlot("in_progress"), false);
  });
});
