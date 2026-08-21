import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { todayRange, formatTime, formatDuration } from "@/lib/date";
import { uploadChildPhotoAction } from "@/lib/photo-actions";
import {
  MEAL_TYPE_LABELS,
  CONSUMPTION_LABELS,
  HYGIENE_TYPE_LABELS,
  ACTIVITY_CATEGORY_LABELS,
  MOOD_LABELS,
  INCIDENT_TYPE_LABELS,
} from "@/lib/labels";
import {
  addMealAction,
  startSleepAction,
  endSleepAction,
  addHygieneAction,
  addMoodAction,
  addHealthLogAction,
  addIncidentAction,
  addMedicationAdministrationAction,
  addActivityAction,
} from "./actions";

const inputClass =
  "border border-[#ECE1CB] rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[#1FA787] transition-colors bg-white w-full";
const smallBtn =
  "bg-[#1FA787] text-white text-xs font-semibold rounded-lg py-1.5 font-[family-name:var(--font-baloo)]";
const cardClass = "bg-[#FFFDF8] rounded-2xl shadow-sm p-4 flex flex-col gap-2";
const cardTitle = "font-[family-name:var(--font-baloo)] font-semibold text-sm text-[#2E2418]";

type TimelineEntry = { time: Date; label: string; detail: string };

export default async function ChildJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: childId } = await params;
  const { start, end } = todayRange();

  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) notFound();

  const [
    attendance,
    meals,
    sleeps,
    hygiene,
    moods,
    healthLogs,
    incidents,
    medicationAdmins,
    activityLinks,
    medicationAuthorizations,
    photos,
  ] = await Promise.all([
    prisma.attendance.findFirst({ where: { childId, date: start } }),
    prisma.mealRecord.findMany({ where: { childId, time: { gte: start, lt: end } } }),
    prisma.sleepRecord.findMany({ where: { childId, startTime: { gte: start, lt: end } } }),
    prisma.hygieneRecord.findMany({ where: { childId, time: { gte: start, lt: end } } }),
    prisma.moodRecord.findMany({ where: { childId, time: { gte: start, lt: end } } }),
    prisma.healthLog.findMany({ where: { childId, time: { gte: start, lt: end } } }),
    prisma.incident.findMany({ where: { childId, time: { gte: start, lt: end } } }),
    prisma.medicationAdministration.findMany({
      where: { childId, time: { gte: start, lt: end } },
      include: { authorization: true },
    }),
    prisma.activityChild.findMany({
      where: { childId, activity: { date: start } },
      include: { activity: true },
    }),
    prisma.medicationAuthorization.findMany({
      where: { childId, active: true },
    }),
    prisma.photo.findMany({ where: { childId, takenAt: { gte: start, lt: end } }, orderBy: { takenAt: "desc" } }),
  ]);

  const openSleep = sleeps.find((s) => !s.endTime);

  const timeline: TimelineEntry[] = [];
  if (attendance?.checkInTime) {
    timeline.push({
      time: attendance.checkInTime,
      label: "Chegada",
      detail: `Levado por ${attendance.checkInPersonName}${attendance.checkInPersonRelation ? ` — ${attendance.checkInPersonRelation}` : ""}`,
    });
  }
  if (attendance?.checkOutTime) {
    timeline.push({
      time: attendance.checkOutTime,
      label: "Saída",
      detail: `Retirado por ${attendance.checkOutPersonName}${attendance.checkOutPersonRelation ? ` — ${attendance.checkOutPersonRelation}` : ""}`,
    });
  }
  for (const m of meals) {
    timeline.push({ time: m.time, label: MEAL_TYPE_LABELS[m.mealType], detail: CONSUMPTION_LABELS[m.consumption] });
  }
  for (const s of sleeps) {
    timeline.push({
      time: s.startTime,
      label: "Soneca",
      detail: s.endTime
        ? `${formatTime(s.startTime)} → ${formatTime(s.endTime)} (${formatDuration(s.startTime.getTime(), s.endTime.getTime())})`
        : "Em andamento",
    });
  }
  for (const h of hygiene) {
    timeline.push({ time: h.time, label: "Higiene", detail: HYGIENE_TYPE_LABELS[h.type] });
  }
  for (const mo of moods) {
    timeline.push({ time: mo.time, label: "Humor", detail: MOOD_LABELS[mo.mood] });
  }
  for (const hl of healthLogs) {
    timeline.push({
      time: hl.time,
      label: "Saúde",
      detail: [hl.temperature ? `${hl.temperature}°C` : null, hl.symptoms].filter(Boolean).join(" — ") || "Registro",
    });
  }
  for (const inc of incidents) {
    timeline.push({ time: inc.time, label: "Ocorrência", detail: `${INCIDENT_TYPE_LABELS[inc.type]}: ${inc.description}` });
  }
  for (const md of medicationAdmins) {
    timeline.push({ time: md.time, label: "Medicamento", detail: `${md.authorization.medication} — administrado` });
  }
  for (const al of activityLinks) {
    timeline.push({ time: al.activity.time, label: "Atividade", detail: ACTIVITY_CATEGORY_LABELS[al.activity.category] });
  }
  for (const p of photos) {
    timeline.push({ time: p.takenAt, label: "Foto", detail: p.caption || "Registrada" });
  }
  timeline.sort((a, b) => a.time.getTime() - b.time.getTime());

  return (
    <div className="p-6 grid grid-cols-[1fr_360px] gap-6 max-w-6xl mx-auto items-start">
      <div className="flex flex-col gap-4">
        <h1 className="font-[family-name:var(--font-baloo)] font-semibold text-xl text-[#2E2418]">
          Jornada — {child.preferredName || child.fullName}
        </h1>

        <div className="bg-[#FFFDF8] rounded-2xl shadow-sm p-5">
          {timeline.length === 0 ? (
            <p className="text-sm text-[#8A7A62]">Nenhum registro hoje ainda.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {timeline.map((entry, i) => (
                <li key={i} className="flex gap-3 items-start text-sm">
                  <span className="font-mono text-xs text-[#9A8A72] w-12 shrink-0 pt-0.5">
                    {formatTime(entry.time)}
                  </span>
                  <div>
                    <span className="font-semibold text-[#2E2418]">{entry.label}</span>
                    <span className="text-[#6B5D4A]"> — {entry.detail}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className={cardClass}>
          <span className={cardTitle}>Alimentação</span>
          <form action={addMealAction} className="flex flex-col gap-1.5">
            <input type="hidden" name="childId" value={childId} />
            <select name="mealType" className={inputClass} defaultValue="SNACK">
              {Object.entries(MEAL_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select name="consumption" className={inputClass} defaultValue="WELL">
              {Object.entries(CONSUMPTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input name="notes" placeholder="Observação" className={inputClass} />
            <button type="submit" className={smallBtn}>Registrar</button>
          </form>
        </div>

        <div className={cardClass}>
          <span className={cardTitle}>Sono</span>
          {openSleep ? (
            <form action={endSleepAction} className="flex flex-col gap-1.5">
              <input type="hidden" name="childId" value={childId} />
              <input type="hidden" name="sleepId" value={openSleep.id} />
              <p className="text-xs text-[#8A7A62]">Iniciado às {formatTime(openSleep.startTime)}</p>
              <button type="submit" className={smallBtn}>Finalizar soneca</button>
            </form>
          ) : (
            <form action={startSleepAction} className="flex flex-col gap-1.5">
              <input type="hidden" name="childId" value={childId} />
              <button type="submit" className={smallBtn}>Iniciar soneca</button>
            </form>
          )}
        </div>

        <div className={cardClass}>
          <span className={cardTitle}>Higiene</span>
          <form action={addHygieneAction} className="flex flex-col gap-1.5">
            <input type="hidden" name="childId" value={childId} />
            <select name="type" className={inputClass} defaultValue="DIAPER_CHANGE">
              {Object.entries(HYGIENE_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input name="notes" placeholder="Observação" className={inputClass} />
            <button type="submit" className={smallBtn}>Registrar</button>
          </form>
        </div>

        <div className={cardClass}>
          <span className={cardTitle}>Humor</span>
          <form action={addMoodAction} className="flex flex-col gap-1.5">
            <input type="hidden" name="childId" value={childId} />
            <select name="mood" className={inputClass} defaultValue="GOOD">
              {Object.entries(MOOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input name="notes" placeholder="Observação" className={inputClass} />
            <button type="submit" className={smallBtn}>Registrar</button>
          </form>
        </div>

        <div className={cardClass}>
          <span className={cardTitle}>Atividade</span>
          <form action={addActivityAction} className="flex flex-col gap-1.5">
            <input type="hidden" name="childId" value={childId} />
            <select name="category" className={inputClass} defaultValue="RECREATION">
              {Object.entries(ACTIVITY_CATEGORY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input name="description" placeholder="Descrição" className={inputClass} />
            <button type="submit" className={smallBtn}>Registrar</button>
          </form>
        </div>

        <div className={cardClass}>
          <span className={cardTitle}>Temperatura / saúde</span>
          <form action={addHealthLogAction} className="flex flex-col gap-1.5">
            <input type="hidden" name="childId" value={childId} />
            <input name="temperature" placeholder="Temperatura (°C)" className={inputClass} />
            <input name="symptoms" placeholder="Sintomas" className={inputClass} />
            <input name="notes" placeholder="Observação" className={inputClass} />
            <button type="submit" className={smallBtn}>Registrar</button>
          </form>
        </div>

        {medicationAuthorizations.length > 0 && (
          <div className={cardClass}>
            <span className={cardTitle}>Medicamento</span>
            <form action={addMedicationAdministrationAction} className="flex flex-col gap-1.5">
              <input type="hidden" name="childId" value={childId} />
              <select name="authorizationId" className={inputClass}>
                {medicationAuthorizations.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.medication} — {m.dosage}
                  </option>
                ))}
              </select>
              <input name="notes" placeholder="Observação" className={inputClass} />
              <button type="submit" className={smallBtn}>Confirmar administração</button>
            </form>
          </div>
        )}

        <div className={cardClass}>
          <span className={cardTitle}>Ocorrência</span>
          <form action={addIncidentAction} className="flex flex-col gap-1.5">
            <input type="hidden" name="childId" value={childId} />
            <select name="type" className={inputClass} defaultValue="OTHER">
              {Object.entries(INCIDENT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input name="description" placeholder="Descrição" required className={inputClass} />
            <input name="actionsTaken" placeholder="Providências" className={inputClass} />
            <button type="submit" className="bg-[#E85570] text-white text-xs font-semibold rounded-lg py-1.5 font-[family-name:var(--font-baloo)]">
              Registrar ocorrência
            </button>
          </form>
        </div>

        <div className={cardClass}>
          <span className={cardTitle}>Fotos</span>
          {!child.imageAuthorized ? (
            <p className="text-xs text-[#E85570]">Sem autorização de imagem — envio bloqueado.</p>
          ) : (
            <>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-1.5">
                  {photos.map((p) => (
                    <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-[#F3EEE1]">
                      <Image src={p.url} alt={p.caption ?? ""} fill sizes="100px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <form action={uploadChildPhotoAction} encType="multipart/form-data" className="flex flex-col gap-1.5">
                <input type="hidden" name="childId" value={childId} />
                <input type="hidden" name="revalidateTo" value={`/cuidadora/criancas/${childId}`} />
                <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" required className="text-xs" />
                <input name="caption" placeholder="Legenda" className={inputClass} />
                <button type="submit" className={smallBtn}>Enviar foto</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
