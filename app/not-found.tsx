import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass">404</p>
      <h1 className="mt-4 text-3xl sm:text-4xl">Такой страницы нет</h1>
      <p className="mt-4 leading-relaxed text-ink-2">
        Возможно, код записи введён с опечаткой — в нём нет цифр 0 и 1
        и букв I, O, Q, чтобы их не путали. Проверьте код в сообщении
        или начните с главной.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-xl bg-ink px-6 py-3.5 font-semibold text-bg transition-transform hover:scale-[1.01]"
        >
          На главную
        </Link>
        <Link
          href="/#booking"
          className="rounded-xl border border-line px-6 py-3.5 font-semibold transition-colors hover:border-brass"
        >
          Записаться
        </Link>
      </div>
    </main>
  );
}
