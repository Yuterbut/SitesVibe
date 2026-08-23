import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Что происходит с вашими данными",
  description:
    "Короткое и честное объяснение: сайт не хранит имя, телефон и VIN. Заявка уходит мастеру в Telegram.",
};

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-6 py-20">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-widest text-muted hover:text-brass"
      >
        ← На главную
      </Link>

      <h1 className="mt-8 text-3xl sm:text-4xl">Что происходит с вашими данными</h1>

      <p className="mt-6 text-lg text-ink-2">
        Коротко: сайт их не хранит. Всё, что вы вводите в форму записи, уходит
        мастеру в Telegram и остаётся только там.
      </p>

      <section className="mt-12 flex flex-col gap-8">
        <div>
          <h2 className="text-xl">Что сайт сохраняет у себя</h2>
          <p className="mt-3 leading-relaxed text-ink-2">
            Только занятость поста: какая работа, на каком посту, с какого
            и по какое время, и короткий код записи. По этим сведениям нельзя
            понять, кто вы, — они нужны, чтобы на одно время не записались двое.
          </p>
        </div>

        <div>
          <h2 className="text-xl">Что уходит мастеру и не остаётся на сайте</h2>
          <p className="mt-3 leading-relaxed text-ink-2">
            Имя, телефон, марка автомобиля, VIN и описание проблемы. Они
            складываются в текст сообщения, отправляются в личный чат мастера
            и в базу сайта не записываются. В логи сервера тоже — это отдельно
            проверено в коде.
          </p>
        </div>

        <div>
          <h2 className="text-xl">Зачем это нужно</h2>
          <p className="mt-3 leading-relaxed text-ink-2">
            Чтобы перезвонить, подтвердить запись и заранее понять, какие
            запчасти могут понадобиться. Ни для чего другого: рассылок нет,
            третьим лицам данные не передаются, рекламные счётчики к форме
            не подключены.
          </p>
        </div>

        <div>
          <h2 className="text-xl">Сколько это хранится</h2>
          <p className="mt-3 leading-relaxed text-ink-2">
            Ровно столько, сколько сообщение живёт в переписке мастера. Удалить
            его можно, попросив мастера удалить чат — на стороне сайта удалять
            нечего, там ничего и не появлялось.
          </p>
        </div>

        <div>
          <h2 className="text-xl">Если не хочется заполнять форму</h2>
          <p className="mt-3 leading-relaxed text-ink-2">
            Напишите в Telegram напрямую. Результат тот же самый — разница
            только в том, что форма заодно займёт для вас время на посту.
          </p>
        </div>
      </section>

      <p className="mt-12 border-t border-line pt-8 text-sm text-muted">
        Мастерская — частное лицо, а не компания. Если у вас есть вопросы
        о ваших данных, задайте их мастеру напрямую в Telegram.
      </p>
    </main>
  );
}
