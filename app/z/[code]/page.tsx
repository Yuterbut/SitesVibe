import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { SHOP_TZ_OFFSET_MINUTES, shopLabel } from "@/lib/schedule";
import { STATUS_VIEW, isStatus } from "@/lib/status";

// Статус меняется в любой момент — кешировать нечего.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Статус записи — NiKillya",
  robots: { index: false },
};

const TONE_CLASSES = {
  neutral: "bg-surface-2 text-ink-2",
  active: "bg-ok-bg text-ok",
  done: "bg-ok-bg text-ok",
  cancelled: "bg-danger-bg text-danger",
} as const;

function dateWords(at: Date): string {
  const shifted = new Date(at.getTime() + SHOP_TZ_OFFSET_MINUTES * 60_000);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "UTC",
  }).format(shifted);
}

export default async function BookingStatus({
  params,
}: PageProps<"/z/[code]">) {
  const { code } = await params;

  const booking = await db.booking.findUnique({
    where: { code: code.toUpperCase() },
    include: { service: { select: { name: true, mode: true } } },
  });

  if (!booking) notFound();

  const status = isStatus(booking.status) ? booking.status : "new";
  const view = STATUS_VIEW[status];
  const wholeDay = booking.service.mode === "day";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-16">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-muted hover:text-brass"
      >
        ← NiKillya
      </Link>

      <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Запись
      </p>
      <h1 className="mt-2 font-mono text-4xl tracking-[0.15em] text-brass">
        {booking.code}
      </h1>

      <div
        className={`mt-8 rounded-2xl px-5 py-4 ${TONE_CLASSES[view.tone]}`}
      >
        <p className="font-display text-lg tracking-tight">{view.label}</p>
        <p className="mt-1.5 text-[15px] leading-relaxed opacity-90">{view.hint}</p>
      </div>

      <dl className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Работа</dt>
          <dd className="text-right font-medium">{booking.service.name}</dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-line pt-4">
          <dt className="text-muted">Когда</dt>
          <dd className="text-right font-medium">
            {dateWords(booking.startAt)}
            {wholeDay ? (
              <span className="block text-sm font-normal text-muted">
                машина остаётся на день
              </span>
            ) : (
              <span className="block font-mono text-sm font-normal text-muted">
                {shopLabel(booking.startAt)}–{shopLabel(booking.endAt)}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <p className="mt-8 text-sm leading-relaxed text-muted">
        Отменить или перенести — звонком мастеру, так быстрее всего. Эта
        страница показывает только состояние работы: ни имени, ни телефона
        на сайте не хранится.
      </p>
    </main>
  );
}
