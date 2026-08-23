import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { db as prisma } from "../lib/db";

type Row = {
  id: string;
  name: string;
  category: string;
  labor_hours: string;
  slot_hours: string;
  mode: string;
  confidence: string;
};

/** Разбор CSV с поддержкой полей в кавычках — в названиях работ есть запятые. */
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ""));
  return body.map((cells) =>
    Object.fromEntries(header.map((h, i) => [h.trim(), cells[i] ?? ""])),
  ) as unknown as Row[];
}

async function main() {
  const csv = readFileSync(join(process.cwd(), "data", "services.csv"), "utf8");
  const services = parseCsv(csv);

  if (services.length === 0) {
    throw new Error("data/services.csv пуст — сидить нечем");
  }

  // Два поста. Вся мощность мастерской.
  for (const bay of [
    { id: 1, name: "Пост 1" },
    { id: 2, name: "Пост 2" },
  ]) {
    await prisma.bay.upsert({
      where: { id: bay.id },
      update: { name: bay.name },
      create: bay,
    });
  }

  // Порядок в CSV задаёт порядок вывода в каталоге.
  let order = 0;
  for (const s of services) {
    const slotHours = Number(s.slot_hours);
    const laborHours = Number(s.labor_hours);

    if (!Number.isFinite(slotHours) || slotHours <= 0) {
      throw new Error(`Услуга ${s.id}: некорректный slot_hours «${s.slot_hours}»`);
    }
    if (!Number.isFinite(laborHours) || laborHours <= 0) {
      throw new Error(`Услуга ${s.id}: некорректный labor_hours «${s.labor_hours}»`);
    }
    if (s.mode !== "timed" && s.mode !== "day") {
      throw new Error(`Услуга ${s.id}: mode должен быть timed или day, получено «${s.mode}»`);
    }
    // Сетка записи — 30 минут, длительность обязана на неё ложиться.
    if (Math.round(slotHours * 2) !== slotHours * 2) {
      throw new Error(`Услуга ${s.id}: slot_hours ${slotHours} не кратен получасу`);
    }

    const data = {
      name: s.name,
      category: s.category,
      laborHours,
      slotHours,
      mode: s.mode,
      confidence: s.confidence,
      sortOrder: order++,
    };

    await prisma.service.upsert({
      where: { id: s.id },
      update: data,
      create: { id: s.id, ...data },
    });
  }

  const timed = services.filter((s) => s.mode === "timed").length;
  console.log(
    `Загружено: 2 поста, ${services.length} услуг (${timed} с выбором времени, ${services.length - timed} «машина остаётся»)`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
