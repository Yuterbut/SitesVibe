import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { SHOP_TZ_OFFSET_MINUTES, shopLabel } from "@/lib/schedule";
import { STATUS_VIEW, isStatus, nextStatuses } from "@/lib/status";
import { readToken } from "@/lib/tokens";
import StatusButtons from "./StatusButtons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Управление записью",
  // Служебная страница мастера: в поиске ей делать нечего.
  robots: { index: false, follow: false },
};

function dateWords(at: Date): string {
  const shifted = new Date(at.getTime() + SHOP_TZ_OFFSET_MINUTES * 60_000);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "UTC",
  }).format(shifted);
}

export default async function MasterView({ params }: PageProps<"/m/[token]">) {
  const { token } = await params;

  const bookingId = readToken(token);
  if (!bookingId) notFound();

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: { select: { name: true, mode: true, slotHours: true } },
      bay: { select: { name: true } },
    },
  });
  if (!booking) notFound();

  const status = isStatus(booking.status) ? booking.status : "new";
  const view = STATUS_VIEW[status];
  const wholeDay = booking.service.mode === "day";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Управление записью
      </p>
      <h1 className="mt-2 font-mono text-4xl tracking-[0.15em] text-brass">
        {booking.code}
      </h1>

      <dl className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
        <div className="flex justify-between gap-6">
          <dt className="text-muted">Работа</dt>
          <dd className="text-right font-medium">{booking.service.name}</dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-line pt-4">
          <dt className="text-muted">Когда</dt>
          <dd className="text-right font-medium">
            {dateWords(booking.startAt)}
            <span className="block font-mono text-sm font-normal text-muted">
              {wholeDay
                ? "весь день"
                : `${shopLabel(booking.startAt)}–${shopLabel(booking.endAt)}`}
            </span>
          </dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-line pt-4">
          <dt className="text-muted">Пост</dt>
          <dd className="text-right font-medium">{booking.bay.name}</dd>
        </div>
        <div className="flex justify-between gap-6 border-t border-line pt-4">
          <dt className="text-muted">Сейчас</dt>
          <dd className="text-right font-medium">{view.label}</dd>
        </div>
      </dl>

      <h2 className="mt-10 text-lg">Изменить статус</h2>
      <p className="mb-4 mt-1 text-sm text-muted">
        Клиент увидит это на странице <span className="font-mono">/z/{booking.code}</span>.
        Отмена вернёт время в продажу.
      </p>
      <StatusButtons token={token} options={nextStatuses(status)} />

      <p className="mt-12 border-t border-line pt-6 text-sm leading-relaxed text-muted">
        Контактов клиента здесь нет и не будет — они остались в том сообщении
        Telegram, где пришла заявка.
      </p>
    </main>
  );
}
