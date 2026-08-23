"use client";

import { useActionState } from "react";

import { STATUS_VIEW, type Status } from "@/lib/status";
import { setStatus, type ActionResult } from "./actions";

const TONE_CLASSES: Record<Status, string> = {
  pending: "border-line",
  new: "border-line",
  confirmed: "border-line hover:border-brass",
  in_progress: "border-line hover:border-brass",
  done: "border-ok text-ok hover:bg-ok-bg",
  cancelled: "border-danger text-danger hover:bg-danger-bg",
};

export default function StatusButtons({
  token,
  options,
}: {
  token: string;
  options: Status[];
}) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(
    setStatus,
    {},
  );

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted">
        Запись закрыта. Дальше двигать её нельзя — так случайное нажатие
        не займёт уже освободившееся время.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {options.map((status) => (
          <form key={status} action={action}>
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              disabled={pending}
              className={`rounded-xl border px-5 py-3 font-semibold transition-colors disabled:opacity-50 ${TONE_CLASSES[status]}`}
            >
              {STATUS_VIEW[status].label}
            </button>
          </form>
        ))}
      </div>
      {state.error ? (
        <p className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
