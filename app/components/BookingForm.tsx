"use client";

import { useEffect, useMemo, useState } from "react";

export type ServiceOption = {
  id: string;
  name: string;
  category: string;
  slotHours: number;
  mode: string;
  priceFrom: number | null;
};

type Slot = { at: string; label: string };

type Props = {
  services: ServiceOption[];
  /** Ближайшие рабочие дни: YYYY-MM-DD и подпись. */
  days: { day: string; label: string; weekday: string }[];
  telegramHandle: string;
};

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
  if (hours < 1) return "30 минут";
  const whole = Math.floor(hours);
  const half = hours % 1 !== 0;
  const word = whole === 1 ? "час" : whole < 5 ? "часа" : "часов";
  return half ? `${whole},5 часа` : `${whole} ${word}`;
}

export default function BookingForm({ services, days, telegramHandle }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [day, setDay] = useState(days[0]?.day ?? "");
  const [slot, setSlot] = useState<string>("");

  // null означает «ещё грузим»: отдельный флаг загрузки завёл бы второй
  // источник правды и потребовал бы setState прямо в теле эффекта.
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [wholeDay, setWholeDay] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    vehicle: "",
    vin: "",
    note: "",
    consent: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceOption[]>();
    for (const s of services) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return [...map.entries()];
  }, [services]);

  // Сброс выбора живёт в обработчиках, а не в эффекте: синхронный setState
  // в теле эффекта каскадит перерисовки и справедливо ругается линтером.
  function chooseService(id: string) {
    setServiceId(id);
    setSlots(null);
    setSlot("");
  }

  function chooseDay(value: string) {
    setDay(value);
    setSlots(null);
    setSlot("");
  }

  // Занятость меняется постоянно, поэтому тянем её на каждую смену
  // услуги или дня, а не кешируем.
  useEffect(() => {
    if (!serviceId || !day) return;
    let cancelled = false;

    fetch(`/api/availability?service=${encodeURIComponent(serviceId)}&day=${day}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSlots(data.starts ?? []);
        setWholeDay(Boolean(data.wholeDay));
        // Для «машина остаётся» выбор один — отмечаем его сразу.
        if (data.wholeDay && data.starts?.length) setSlot(day);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      });

    return () => {
      cancelled = true;
    };
  }, [serviceId, day]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setSubmitError(null);
    setFieldErrors({});

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, startAt: slot, ...form }),
      });
      const data = await response.json();

      if (response.ok) {
        setCode(data.code);
        return;
      }
      if (data.fields) setFieldErrors(data.fields);
      setSubmitError(data.error ?? "Что-то пошло не так");

      // Слот заняли, пока клиент заполнял форму — возвращаем к выбору времени.
      if (data.reason === "taken") {
        setStep(1);
        setSlot("");
        setSlots(null);
      }
    } catch {
      setSubmitError("Нет связи с сервером. Проверьте интернет или напишите напрямую.");
    } finally {
      setSending(false);
    }
  }

  if (code) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-card">
        <p className="text-xs uppercase tracking-[0.2em] text-ok">Записано</p>
        <h3 className="mt-3 text-2xl">Мастер уже получил заявку</h3>
        <p className="mt-3 text-ink-2">
          Он перезвонит, чтобы подтвердить. Ваш код записи — назовите его по телефону:
        </p>
        <p className="mt-4 font-mono text-3xl tracking-[0.15em] text-brass">{code}</p>
        <a
          href={`/z/${code}`}
          className="mt-5 inline-block rounded-xl border border-line px-5 py-3 font-semibold transition-colors hover:border-brass"
        >
          Смотреть статус записи
        </a>
        <p className="mt-6 text-sm text-muted">
          Нужно отменить или перенести? Позвоните — так быстрее всего.
        </p>
      </div>
    );
  }

  const canContinue = Boolean(serviceId && day && slot);

  return (
    <form
      onSubmit={submit}
      className="min-w-0 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8"
    >
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted">
        <span className={step === 1 ? "text-brass" : ""}>1 · Что и когда</span>
        <span aria-hidden className="h-px flex-1 bg-line" />
        <span className={step === 2 ? "text-brass" : ""}>2 · Контакты</span>
      </div>

      {step === 1 ? (
        <div className="mt-6 flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Что нужно сделать</span>
            <select
              value={serviceId}
              onChange={(e) => chooseService(e.target.value)}
              className="w-full min-w-0 truncate rounded-xl border border-line bg-bg px-4 py-3 text-ink"
            >
              {grouped.map(([category, list]) => (
                <optgroup key={category} label={CATEGORY_LABELS[category] ?? category}>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {service ? (
            <p className="text-sm text-muted">
              Займёт около{" "}
              <b className="text-ink-2">{hoursLabel(service.slotHours)}</b>
              {service.mode === "day"
                ? ". Машина остаётся на день — время не выбирается."
                : "."}
              {service.priceFrom
                ? ` Цена от ${service.priceFrom.toLocaleString("ru-RU")} ₽.`
                : " Цену мастер назовёт после осмотра."}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">День</span>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => chooseDay(d.day)}
                  aria-pressed={day === d.day}
                  className={`rounded-xl border px-4 py-2.5 text-left transition-colors ${
                    day === d.day
                      ? "border-brass bg-brass text-on-brass"
                      : "border-line bg-bg hover:border-line-strong"
                  }`}
                >
                  <span className="block text-sm font-semibold">{d.label}</span>
                  <span className="block text-xs opacity-70">{d.weekday}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">
              {wholeDay ? "Подтвердите день" : "Время"}
            </span>
            {slots === null ? (
              <p className="text-sm text-muted">Смотрим, что свободно…</p>
            ) : slots && slots.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {slots.map((s) => {
                  const value = wholeDay ? day : s.at;
                  return (
                    <button
                      key={s.at}
                      type="button"
                      onClick={() => setSlot(value)}
                      aria-pressed={slot === value}
                      className={`rounded-lg border px-3.5 py-2 font-mono text-sm transition-colors ${
                        slot === value
                          ? "border-brass bg-brass text-on-brass"
                          : "border-line bg-bg hover:border-line-strong"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted">
                На этот день свободного времени нет. Выберите другой день или напишите
                в Telegram — возможно, получится втиснуть.
              </p>
            )}
          </div>

          {submitError ? (
            <p className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
              {submitError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep(2)}
            className="mt-1 rounded-xl bg-ink px-6 py-3.5 font-semibold text-bg transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Дальше
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <Field
            label="Как вас зовут"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            error={fieldErrors.name}
            autoComplete="name"
          />
          <Field
            label="Телефон"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            error={fieldErrors.phone}
            type="tel"
            placeholder="+7 900 123-45-67"
            autoComplete="tel"
          />
          <Field
            label="Марка и модель"
            value={form.vehicle}
            onChange={(v) => setForm({ ...form, vehicle: v })}
            error={fieldErrors.vehicle}
            placeholder="Lada Vesta, 2019"
          />
          <Field
            label="VIN"
            hint="Необязательно, но с ним мастер закажет нужные запчасти заранее"
            value={form.vin}
            onChange={(v) => setForm({ ...form, vin: v })}
            error={fieldErrors.vin}
            mono
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Что беспокоит</span>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              placeholder="Стучит спереди справа на кочках"
              className="rounded-xl border border-line bg-bg px-4 py-3"
            />
          </label>

          <label className="flex items-start gap-3 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              className="mt-1 size-4 accent-[var(--brass)]"
            />
            <span>
              Согласен на обработку своих данных, чтобы мастер мог перезвонить.{" "}
              <a href="/privacy" className="underline decoration-brass underline-offset-2">
                Что происходит с данными
              </a>
              {fieldErrors.consent ? (
                <b className="mt-1 block text-danger">{fieldErrors.consent}</b>
              ) : null}
            </span>
          </label>

          {submitError ? (
            <p className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
              {submitError}{" "}
              <a
                href={`https://t.me/${telegramHandle}`}
                className="underline underline-offset-2"
              >
                Написать напрямую
              </a>
            </p>
          ) : null}

          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-xl border border-line px-5 py-3.5 font-semibold"
            >
              Назад
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 rounded-xl bg-brass px-6 py-3.5 font-semibold text-on-brass transition-transform hover:scale-[1.01] disabled:opacity-50"
            >
              {sending ? "Отправляем…" : "Записаться"}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  autoComplete,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  mono?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        className={`rounded-xl border bg-bg px-4 py-3 ${mono ? "font-mono" : ""} ${
          error ? "border-danger" : "border-line"
        }`}
      />
      {error ? <span className="text-sm text-danger">{error}</span> : null}
    </label>
  );
}
