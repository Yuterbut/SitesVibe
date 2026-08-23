import BookingForm, { type ServiceOption } from "./components/BookingForm";
import { db } from "@/lib/db";
import { dayLabels, upcomingWorkingDays } from "@/lib/schedule";

// Занятость постов меняется постоянно, поэтому страница считается на запрос.
export const dynamic = "force-dynamic";

const TELEGRAM = "TuTutudo";

const CATEGORY_LABELS: Record<string, string> = {
  express: "Экспресс",
  to: "Техобслуживание",
  brakes: "Тормоза",
  tyres: "Колёса",
  suspension: "Ходовая",
  engine: "Двигатель",
  transmission: "Трансмиссия",
  climate: "Климат",
};

function hoursLabel(hours: number): string {
  if (hours < 1) return "30 мин";
  return Number.isInteger(hours) ? `${hours} ч` : `${Math.floor(hours)},5 ч`;
}

export default async function Home() {
  const services = await db.service.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });

  const options: ServiceOption[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    slotHours: s.slotHours,
    mode: s.mode,
    priceFrom: s.priceFrom,
  }));

  const days = upcomingWorkingDays(6).map((day) => ({ day, ...dayLabels(day) }));

  const byCategory = new Map<string, typeof services>();
  for (const s of services) {
    byCategory.set(s.category, [...(byCategory.get(s.category) ?? []), s]);
  }

  return (
    <main className="flex-1">
      {/* 1 · Подходит ли мне */}
      <section className="grain relative overflow-hidden bg-night text-night-ink">
        <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <p className="font-display text-sm font-semibold tracking-[0.24em] text-brass-hi">
            NIKILLYA
          </p>
          <h1 className="mt-8 max-w-5xl text-[2.6rem] leading-[1.04] sm:text-[4.25rem]">
            Ремонт легковых без сюрпризов в счёте
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-night-muted">
            Небольшая мастерская на два поста. Любые марки, срок называем
            до начала работы и не растягиваем его по ходу. Если вскроется
            что-то ещё — сначала звонок, потом гаечный ключ.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#booking"
              className="rounded-xl bg-brass-hi px-7 py-4 font-semibold text-[#14110f] transition-transform hover:scale-[1.02]"
            >
              Записаться онлайн
            </a>
            <a
              href={`https://t.me/${TELEGRAM}`}
              className="rounded-xl border border-night-line px-7 py-4 font-semibold transition-colors hover:border-brass-hi"
            >
              Написать в Telegram
            </a>
          </div>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-night-muted">
            Пн–Сб · 09:00–19:00
          </p>
        </div>
      </section>

      {/* 2 · Как проходит — снимаем страх «накрутят» */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-2xl sm:text-3xl">Как это устроено</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            {
              n: "01",
              t: "Записываетесь",
              d: "Выбираете работу и время. Видите только то, что реально свободно — на двух постах фантомных окон не бывает.",
            },
            {
              n: "02",
              t: "Мастер перезванивает",
              d: "Уточняет машину и подтверждает. Если по описанию видно, что работа другая, скажет сразу, а не по факту.",
            },
            {
              n: "03",
              t: "Делаем и отдаём",
              d: "Если по ходу вскрывается что-то ещё, сначала звонок и согласование цены, потом работа.",
            },
          ].map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-line bg-surface p-6 shadow-soft"
            >
              <span className="font-mono text-xs text-brass">{s.n}</span>
              <h3 className="mt-3 text-lg">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 3 · Услуги и сроки */}
      <section id="services" className="border-y border-line bg-surface-2">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-2xl sm:text-3xl">Что делаем и сколько это занимает</h2>
          <p className="mt-4 max-w-2xl text-ink-2">
            Время — это сколько машина занимает пост целиком, вместе с приёмкой
            и выдачей, а не только работа руками. Цену мастер называет после
            осмотра: угадывать по телефону — плохая услуга.
          </p>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...byCategory.entries()].map(([category, list]) => (
              <div key={category}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-brass">
                  {CATEGORY_LABELS[category] ?? category}
                </h3>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {list.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-baseline justify-between gap-4 border-b border-line pb-2.5 text-[15px]"
                    >
                      <span className="text-ink-2">{s.name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted">
                        {s.mode === "day" ? "день" : hoursLabel(s.slotHours)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 · Запись */}
      <section id="booking" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl">Записаться</h2>
            <p className="mt-4 text-ink-2">
              Два шага и минута времени. Заявка уходит мастеру в Telegram сразу —
              не в общий ящик, который смотрят раз в день.
            </p>
            <div className="mt-8 rounded-2xl border border-line bg-surface p-6">
              <h3 className="text-base">Данные никуда не сохраняются</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
                Имя, телефон и VIN не попадают в базу сайта — они уходят прямо
                в личный чат мастера, как если бы вы написали ему сами.
                На сайте остаётся только «пост занят с 14:00 до 15:30».
              </p>
            </div>
          </div>

          <BookingForm services={options} days={days} telegramHandle={TELEGRAM} />
        </div>
      </section>

      {/* 5 · Вопросы, снимающие риск */}
      <section className="border-t border-line bg-surface-2">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="text-2xl sm:text-3xl">Частые вопросы</h2>
          <dl className="mt-10 flex flex-col gap-8">
            {[
              {
                q: "Почему цена не указана на сайте",
                a: "Потому что честная цена зависит от машины и от того, что найдётся при осмотре. Ставить «от 990 ₽» и потом называть другую сумму — это не прайс, а приманка. Мастер назовёт цену до начала работы.",
              },
              {
                q: "А если найдётся ещё поломка",
                a: "Звонок и согласование до того, как что-то делать. Без вашего «да» работа не начинается, и в счёте не появляется.",
              },
              {
                q: "Свои запчасти можно",
                a: "Можно. Скажите об этом при подтверждении по телефону — на такие работы гарантия распространяется только на саму работу.",
              },
              {
                q: "Сколько машина займёт пост",
                a: "Сроки в списке услуг — это занятость поста целиком, вместе с приёмкой и выдачей. Работы дольше четырёх часов идут в режиме «машина остаётся»: выбираете день, а не время.",
              },
              {
                q: "Как отменить или перенести запись",
                a: "Позвонить. Это быстрее всего, и мастер сразу освободит время для другого клиента.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-line pb-6">
                <dt className="font-display text-lg tracking-tight">{item.q}</dt>
                <dd className="mt-2 leading-relaxed text-ink-2">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 6 · Последний заход */}
      <footer className="grain relative overflow-hidden bg-night text-night-ink">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl sm:text-3xl">Остались вопросы — просто напишите</h2>
          <p className="mt-4 max-w-lg text-night-muted">
            Не уверены, что именно сломалось? Опишите, как ведёт себя машина,
            и мастер скажет, с чего начинать.
          </p>
          <a
            href={`https://t.me/${TELEGRAM}`}
            className="mt-8 inline-block rounded-xl bg-brass-hi px-7 py-4 font-semibold text-[#14110f] transition-transform hover:scale-[1.02]"
          >
            Telegram · @{TELEGRAM}
          </a>

          <div className="mt-14 flex flex-col gap-2 border-t border-night-line pt-8 font-mono text-xs uppercase tracking-widest text-night-muted sm:flex-row sm:justify-between">
            <span>NiKillya · ремонт легковых</span>
            <a href="/privacy" className="hover:text-brass-hi">
              Что происходит с данными
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
