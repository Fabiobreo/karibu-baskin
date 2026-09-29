"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { useMutation } from "@tanstack/react-query";
import InlineError from "@/components/common/InlineError";
import { useTranslations } from "next-intl";
import { useToast } from "@/context/ToastContext";
import { useActiveDateLocale } from "@/hooks/useActiveDateLocale";
import { readError } from "@/lib/fetchJson";
import { formatRome } from "@/lib/dateUtils";
import { TOUCH_TARGET_MIN } from "@/lib/touchTarget";
// Solo tipi: `eventRsvp` usa Prisma e resta sul server.
import type { GuestRsvp, MemberRsvp } from "@/lib/eventRsvp";

type Status = "GOING" | "MAYBE" | "NOT_GOING";
/** Risposta a una domanda: si', no, o non ancora data. */
type Answer = boolean | null;

export interface EventOptionView {
  id: string;
  label: string;
  startsAt: string | null;
  kind: string;
}

interface EventRsvpProps {
  eventId: string;
  isLoggedIn: boolean;
  isPast: boolean;
  /** La famiglia di chi guarda (io per primo), con le risposte gia' date. */
  members: MemberRsvp[];
  /** Gli esterni aggiunti da chi guarda: gli altri della famiglia non li vedono. */
  guests: GuestRsvp[];
  options: EventOptionView[];
  allowGuests: boolean;
  maxGuests: number | null;
  initialGoing: number;
}

// ── Stato del modulo ──────────────────────────────────────────────────────────
//
// Ogni persona risponde a una domanda per riga: presenza all'evento, poi ogni
// extra, sempre Si'/No. Niente "Forse": "Da rispondere" dice gia' "non so
// ancora", e la risposta si cambia fino all'evento. Nei dati un extra non
// spuntato di chi ha risposto all'evento e' un No; di chi non ha risposto e'
// "da rispondere".

interface Draft {
  event: Answer;
  extras: Record<string, Answer>;
  note: string;
  noteOpen: boolean;
}
interface GuestDraft extends Draft {
  /** Chiave locale stabile anche per gli esterni non ancora salvati. */
  localKey: string;
  id?: string;
  name: string;
}
interface SavedState {
  members: MemberRsvp[];
  guests: GuestRsvp[];
}

/** Stato salvato → risposte. Un "Forse" di prima torna "da rispondere". */
function toDraft(
  status: Status | null,
  optionIds: string[],
  note: string | null,
  options: EventOptionView[]
): Draft {
  const event: Answer = status === "GOING" ? true : status === "NOT_GOING" ? false : null;
  return {
    event,
    extras: Object.fromEntries(
      options.map((o) => [o.id, optionIds.includes(o.id) ? true : event === null ? null : false])
    ),
    note: note ?? "",
    noteOpen: !!note,
  };
}

const toPeople = (members: MemberRsvp[], options: EventOptionView[]) =>
  Object.fromEntries(
    members.map((m) => [m.key, toDraft(m.status, m.optionIds, m.note, options)])
  ) as Record<string, Draft>;

const toGuests = (guests: GuestRsvp[], options: EventOptionView[]): GuestDraft[] =>
  guests.map((g) => ({
    ...toDraft(g.status, g.optionIds, g.note, options),
    localKey: g.id,
    id: g.id,
    name: g.name ?? "",
  }));

const chosenExtras = (d: Draft) =>
  Object.entries(d.extras)
    .filter(([, v]) => v === true)
    .map(([id]) => id);

const toStatus = (a: Answer): Status | null => (a === null ? null : a ? "GOING" : "NOT_GOING");

// Confronto per "modifiche non salvate": solo cio' che si invia.
const fingerprint = (people: Record<string, Draft>, guests: GuestDraft[]) =>
  JSON.stringify([
    Object.entries(people).map(([k, d]) => [k, d.event, d.extras, d.note.trim()]),
    guests.map((g) => [g.id ?? "", g.name.trim(), g.event, g.extras, g.note.trim()]),
  ]);

/** Cosa manca a una persona per poter salvare (null = a posto). */
function missingIn(d: Draft, isGuest: boolean): "event" | "extras" | "nothing" | null {
  const extras = Object.values(d.extras);
  if (isGuest) {
    if (d.event === null) return "event";
    if (extras.some((v) => v === null)) return "extras";
    // Un esterno che non viene a niente non ha senso: si toglie.
    if (d.event === false && !extras.some((v) => v === true)) return "nothing";
    return null;
  }
  const touched = d.event !== null || extras.some((v) => v !== null);
  if (!touched) return null; // non risponde (ancora): va bene
  if (d.event === null) return "event";
  if (extras.some((v) => v === null)) return "extras";
  return null;
}

// ── Pezzi ─────────────────────────────────────────────────────────────────────

/** Si'/No a segmenti: una riga, la scelta in arancio. */
function YesNo({
  value,
  label,
  disabled,
  onChange,
}: {
  value: Answer;
  label: string;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useTranslations("events");
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={value === null ? null : value ? "yes" : "no"}
      disabled={disabled}
      aria-label={label}
      onChange={(_e, v: "yes" | "no" | null) => v && onChange(v === "yes")}
      sx={{
        "& .MuiToggleButton-root": {
          textTransform: "none",
          fontWeight: 700,
          minHeight: 44,
        },
        "& .MuiToggleButton-root.Mui-selected": {
          bgcolor: "primary.fill",
          color: "common.white",
          "&:hover": { bgcolor: "primary.dark" },
        },
      }}
    >
      <ToggleButton value="yes">{t("yes")}</ToggleButton>
      <ToggleButton value="no">{t("no")}</ToggleButton>
    </ToggleButtonGroup>
  );
}

/** Una domanda: etichetta sopra, Si'/No sotto. Se manca la risposta lo dice. */
function Question({
  label,
  hint,
  value,
  missing,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string | null;
  value: Answer;
  missing: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useTranslations("events");
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
        <Typography variant="body2" fontWeight={700}>
          {label}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        )}
        {missing && (
          <Typography variant="caption" color="warning.main" fontWeight={700}>
            {t("toAnswer")}
          </Typography>
        )}
      </Box>
      <YesNo value={value} label={label} disabled={disabled} onChange={onChange} />
    </Box>
  );
}

function NoteToggle({
  open,
  hasNote,
  disabled,
  onClick,
}: {
  open: boolean;
  hasNote: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("events");
  return (
    <Tooltip title={t("addNote")}>
      <IconButton
        onClick={onClick}
        disabled={disabled}
        aria-label={t("addNote")}
        aria-expanded={open}
        sx={{ ...TOUCH_TARGET_MIN, color: hasNote ? "primary.main" : "text.secondary" }}
      >
        {hasNote ? (
          <StickyNote2Icon fontSize="small" />
        ) : (
          <StickyNote2OutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}

function PersonCard({
  dashed,
  header,
  children,
}: {
  dashed?: boolean;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderStyle: dashed ? "dashed" : "solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        minWidth: 0,
      }}
    >
      {header}
      {children}
    </Box>
  );
}

/** Le domande di una scheda: presenza all'evento, poi un extra per riga. */
function Questions({
  draft,
  options,
  disabled,
  onChange,
}: {
  draft: Draft;
  options: EventOptionView[];
  disabled: boolean;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const t = useTranslations("events");
  const dl = useActiveDateLocale();
  // Le righe "da rispondere" si segnalano solo quando la persona ha iniziato.
  const started = draft.event !== null || Object.values(draft.extras).some((v) => v !== null);
  return (
    <>
      <Question
        label={t("eventPresence")}
        value={draft.event}
        missing={started && draft.event === null}
        disabled={disabled}
        onChange={(v) => onChange({ event: v })}
      />
      {options.map((o) => (
        <Question
          key={o.id}
          label={o.label}
          hint={o.startsAt ? formatRome(o.startsAt, "EEE d MMM, HH:mm", { locale: dl }) : null}
          value={draft.extras[o.id] ?? null}
          missing={started && (draft.extras[o.id] ?? null) === null}
          disabled={disabled}
          onChange={(v) => onChange({ extras: { ...draft.extras, [o.id]: v } })}
        />
      ))}
    </>
  );
}

// ── Riepilogo dopo il salvataggio ─────────────────────────────────────────────

function summaryText(
  t: ReturnType<typeof useTranslations>,
  status: Status | null,
  optionIds: string[],
  options: EventOptionView[]
): string | null {
  const extras = options.filter((o) => optionIds.includes(o.id)).map((o) => o.label);
  if (!status) return null;
  if (status === "NOT_GOING") {
    // "Solo pranzo": dentro una frase l'etichetta perde la maiuscola.
    const list = extras.map((e) => e.charAt(0).toLowerCase() + e.slice(1)).join(", ");
    return extras.length ? t("onlyList", { list }) : t("summaryNo");
  }
  // "Forse" resta per le risposte date prima che sparisse dal modulo.
  const base = status === "GOING" ? t("summaryYes") : t("maybe");
  return [base, ...extras].join(" · ");
}

function footerSummary(
  t: ReturnType<typeof useTranslations>,
  going: number,
  extraCounts: { label: string; count: number }[]
): string {
  return [
    t("footerGoing", { count: going }),
    ...extraCounts.map((e) => t("footerOption", { label: e.label, count: e.count })),
  ].join(" · ");
}

function RsvpSummary({
  saved,
  options,
  onEdit,
}: {
  saved: SavedState;
  options: EventOptionView[];
  onEdit: () => void;
}) {
  const t = useTranslations("events");
  const all = [...saved.members, ...saved.guests];
  const going = all.filter((p) => p.status === "GOING").length;
  const extraCounts = options.map((o) => ({
    label: o.label,
    count: all.filter((p) => p.optionIds.includes(o.id)).length,
  }));
  return (
    <Stack spacing={1.5}>
      <Alert
        icon={<CheckCircleOutlineIcon fontSize="inherit" />}
        severity="success"
        sx={{ borderRadius: 2 }}
      >
        <Typography variant="body2" fontWeight={700}>
          {t("sentTitle")}
        </Typography>
        <Typography variant="caption">{footerSummary(t, going, extraCounts)}</Typography>
      </Alert>
      <Box>
        {[
          ...saved.members.map((m) => ({
            key: m.key as string,
            name: m.isSelf ? t("me") : m.name,
            guest: false,
            text: summaryText(t, m.status, m.optionIds, options),
          })),
          ...saved.guests.map((g, i) => ({
            key: g.id,
            name: g.name || t("guestFallback", { n: i + 1 }),
            guest: true,
            text: summaryText(t, g.status, g.optionIds, options),
          })),
        ].map((r) => (
          <Box
            key={r.key}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 2,
              py: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
              "&:last-of-type": { borderBottom: 0 },
            }}
          >
            <Typography variant="body2" fontWeight={700} sx={{ minWidth: 0 }} noWrap>
              {r.name}
              {r.guest && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {" · "}
                  {t("guestTag")}
                </Typography>
              )}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: r.text ? "text.secondary" : "warning.main", textAlign: "right" }}
            >
              {r.text ?? t("toAnswer")}
            </Typography>
          </Box>
        ))}
      </Box>
      <Button
        variant="outlined"
        startIcon={<EditIcon />}
        onClick={onEdit}
        sx={{ alignSelf: "flex-start" }}
      >
        {t("editAnswers")}
      </Button>
    </Stack>
  );
}

// ── Modulo ────────────────────────────────────────────────────────────────────

function RsvpForm({
  eventId,
  members: initialMembers,
  guests: initialGuests,
  options,
  allowGuests,
  maxGuests,
  onGoingChange,
}: Omit<EventRsvpProps, "isLoggedIn" | "isPast" | "initialGoing"> & {
  onGoingChange: (going: number) => void;
}) {
  const t = useTranslations("events");
  const { showToast } = useToast();
  const [saved, setSaved] = useState<SavedState>({
    members: initialMembers,
    guests: initialGuests,
  });
  const [people, setPeople] = useState(() => toPeople(initialMembers, options));
  const [guests, setGuests] = useState(() => toGuests(initialGuests, options));
  const [nextGuest, setNextGuest] = useState(1);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; localKey: string } | null>(null);

  const members = saved.members;
  const hasExtras = options.length > 0;
  // Una persona sola, niente extra ne' esterni: basta Si'/No, salvato subito.
  const simple = members.length === 1 && !hasExtras && !allowGuests;
  const answeredBefore = members.some((m) => m.status) || saved.guests.length > 0;
  const [editing, setEditing] = useState(!answeredBefore);

  const dirty =
    fingerprint(people, guests) !==
    fingerprint(toPeople(saved.members, options), toGuests(saved.guests, options));

  // Uscire con modifiche non salvate: il browser chiede conferma.
  useEffect(() => {
    if (!dirty || simple) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, simple]);

  const setPerson = (key: string, patch: Partial<Draft>) =>
    setPeople((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  const setGuest = (localKey: string, patch: Partial<GuestDraft>) =>
    setGuests((gs) => gs.map((g) => (g.localKey === localKey ? { ...g, ...patch } : g)));
  const guestLabel = (g: GuestDraft, i: number) =>
    g.name.trim() || t("guestFallback", { n: i + 1 });
  const canAddGuest = allowGuests && (maxGuests === null || guests.length < maxGuests);

  // La prima cosa che manca, per il messaggio accanto a Salva.
  const problem = (() => {
    for (const m of members) {
      if (missingIn(people[m.key], false)) {
        return m.isSelf ? t("missingSelf") : t("missingFor", { name: m.name });
      }
    }
    for (const [i, g] of guests.entries()) {
      const miss = missingIn(g, true);
      if (miss === "nothing") return t("guestNothing", { name: guestLabel(g, i) });
      if (miss) return t("missingFor", { name: guestLabel(g, i) });
    }
    return null;
  })();

  const mutation = useMutation({
    mutationFn: async (vars?: { people: Record<string, Draft> }) => {
      const source = vars?.people ?? people;
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people: members.map((m) => ({
            key: m.key,
            status: toStatus(source[m.key].event),
            optionIds: chosenExtras(source[m.key]),
            note: source[m.key].note.trim() || null,
          })),
          guests: guests.map((g) => ({
            id: g.id,
            name: g.name.trim() || null,
            status: toStatus(g.event),
            optionIds: chosenExtras(g),
            note: g.note.trim() || null,
          })),
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      return (await res.json()) as SavedState & { going: number };
    },
    onSuccess: (state) => {
      // Si riparte dallo stato salvato: id degli esterni nuovi, "risposto da".
      setSaved({ members: state.members, guests: state.guests });
      setPeople(toPeople(state.members, options));
      setGuests(toGuests(state.guests, options));
      onGoingChange(state.going);
      if (!simple) setEditing(false);
      showToast({ message: t("saved"), severity: "success" });
    },
    // L'errore resta sotto il salvataggio (UX-25).
  });
  const busy = mutation.isPending;

  const errorBox = mutation.isError && (
    <InlineError
      title={t("rsvpNotSaved")}
      message={mutation.error instanceof Error ? mutation.error.message : t("saveError")}
      onRetry={() => mutation.mutate(undefined)}
      onClose={() => mutation.reset()}
      retrying={busy}
    />
  );

  // ── Caso semplice: un tocco e la risposta e' salvata ──
  if (simple) {
    const m = members[0];
    return (
      <Stack spacing={1}>
        <YesNo
          value={people[m.key].event}
          label={t("eventPresence")}
          disabled={busy}
          onChange={(v) => {
            const next = { ...people, [m.key]: { ...people[m.key], event: v } };
            setPeople(next);
            mutation.mutate({ people: next });
          }}
        />
        {errorBox}
      </Stack>
    );
  }

  // ── Risposta gia' data: riepilogo compatto ──
  if (!editing) {
    return <RsvpSummary saved={saved} options={options} onEdit={() => setEditing(true)} />;
  }

  const drafts: Draft[] = [...Object.values(people), ...guests];
  const draftGoing = drafts.filter((d) => d.event === true).length;
  const extraCounts = options.map((o) => ({
    label: o.label,
    count: drafts.filter((d) => d.extras[o.id] === true).length,
  }));

  return (
    <Stack spacing={2}>
      {members.length > 1 && (
        <Button
          variant="outlined"
          startIcon={<GroupsIcon />}
          disabled={busy}
          onClick={() =>
            setPeople((p) =>
              Object.fromEntries(Object.entries(p).map(([k, d]) => [k, { ...d, event: true }]))
            )
          }
          sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, fontWeight: 700 }}
        >
          {t("allComing")}
        </Button>
      )}

      {/* Schede: una per persona, una domanda per riga. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {members.map((m) => {
          const d = people[m.key];
          return (
            <PersonCard
              key={m.key}
              header={
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={800} noWrap>
                      {m.isSelf ? t("me") : m.name}
                    </Typography>
                    {m.respondedByName && (
                      <Typography variant="caption" color="text.secondary" component="div">
                        {t("respondedBy", { name: m.respondedByName })}
                      </Typography>
                    )}
                  </Box>
                  <NoteToggle
                    open={d.noteOpen}
                    hasNote={!!d.note.trim()}
                    disabled={busy}
                    onClick={() => setPerson(m.key, { noteOpen: !d.noteOpen })}
                  />
                </Box>
              }
            >
              <Questions
                draft={d}
                options={options}
                disabled={busy}
                onChange={(patch) => setPerson(m.key, patch)}
              />
              {d.noteOpen && (
                <TextField
                  size="small"
                  multiline
                  value={d.note}
                  onChange={(e) => setPerson(m.key, { note: e.target.value })}
                  placeholder={t("notePlaceholder")}
                  disabled={busy}
                  autoFocus={!d.note}
                />
              )}
            </PersonCard>
          );
        })}

        {guests.map((g, i) => (
          <PersonCard
            key={g.localKey}
            dashed
            header={
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Il nome si scrive direttamente nel titolo della scheda. */}
                  <InputBase
                    value={g.name}
                    onChange={(e) => setGuest(g.localKey, { name: e.target.value })}
                    placeholder={t("guestNamePlaceholder")}
                    disabled={busy}
                    inputProps={{ maxLength: 80, "aria-label": t("guestName") }}
                    sx={{
                      typography: "subtitle1",
                      fontWeight: 800,
                      width: "100%",
                      "& input": { p: 0 },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t("guestTag")}
                  </Typography>
                </Box>
                <NoteToggle
                  open={g.noteOpen}
                  hasNote={!!g.note.trim()}
                  disabled={busy}
                  onClick={() => setGuest(g.localKey, { noteOpen: !g.noteOpen })}
                />
                <IconButton
                  aria-label={t("guestMenu", { name: guestLabel(g, i) })}
                  onClick={(e) => setMenu({ anchor: e.currentTarget, localKey: g.localKey })}
                  disabled={busy}
                  sx={TOUCH_TARGET_MIN}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <Questions
              draft={g}
              options={options}
              disabled={busy}
              onChange={(patch) => setGuest(g.localKey, patch)}
            />
            {missingIn(g, true) === "nothing" && (
              <Typography variant="caption" color="warning.main">
                {t("guestNothing", { name: guestLabel(g, i) })}
              </Typography>
            )}
            {g.noteOpen && (
              <TextField
                size="small"
                multiline
                value={g.note}
                onChange={(e) => setGuest(g.localKey, { note: e.target.value })}
                placeholder={t("notePlaceholder")}
                disabled={busy}
                autoFocus={!g.note}
              />
            )}
          </PersonCard>
        ))}
      </Box>

      <Menu anchorEl={menu?.anchor} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem
          onClick={() => {
            setGuests((gs) => gs.filter((x) => x.localKey !== menu?.localKey));
            setMenu(null);
          }}
          sx={{ color: "error.main" }}
        >
          {t("removeGuestAction")}
        </MenuItem>
      </Menu>

      {allowGuests && (
        <Box>
          <Button
            startIcon={<PersonAddAltIcon />}
            disabled={busy || !canAddGuest}
            onClick={() => {
              setGuests((gs) => [
                ...gs,
                {
                  localKey: `new-${nextGuest}`,
                  name: "",
                  event: null,
                  extras: Object.fromEntries(options.map((o) => [o.id, null])),
                  note: "",
                  noteOpen: false,
                },
              ]);
              setNextGuest((n) => n + 1);
            }}
            sx={{ fontWeight: 700, textTransform: "none" }}
          >
            {t("bringSomeone")}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {canAddGuest ? t("guestsHint") : t("guestsLimit", { count: maxGuests ?? 0 })}
          </Typography>
        </Box>
      )}

      {/* Barra di salvataggio: su mobile resta in vista sopra la navigazione
          finche' ci sono modifiche da salvare. */}
      <Box
        sx={{
          position: dirty ? "sticky" : "static",
          bottom: { xs: "calc(60px + env(safe-area-inset-bottom, 0px))", md: 0 },
          zIndex: 2,
          mx: -3,
          px: 3,
          py: 1.5,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          borderRadius: "0 0 24px 24px",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700}>
              {footerSummary(t, draftGoing, extraCounts)}
            </Typography>
            {dirty && (
              <Typography variant="caption" color="text.secondary">
                {t("unsaved")}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            {answeredBefore && (
              <Button
                onClick={() => {
                  // Annulla: si torna alle risposte salvate.
                  setPeople(toPeople(saved.members, options));
                  setGuests(toGuests(saved.guests, options));
                  setEditing(false);
                }}
                disabled={busy}
              >
                {t("cancel")}
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => mutation.mutate(undefined)}
              disabled={busy || !!problem || !dirty}
              sx={{ fontWeight: 700 }}
            >
              {t("save")}
            </Button>
          </Box>
        </Box>
        {problem && (
          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
            {problem}
          </Typography>
        )}
        {errorBox}
      </Box>
    </Stack>
  );
}

export default function EventRsvp({ isLoggedIn, isPast, initialGoing, ...form }: EventRsvpProps) {
  const t = useTranslations("events");
  const [goingCount, setGoingCount] = useState(initialGoing);

  return (
    <Paper elevation={0} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 1,
          mb: 2,
        }}
      >
        <Typography variant="h6" component="h2" fontWeight={800}>
          {t("rsvpTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("goingCount", { count: goingCount })}
        </Typography>
      </Box>

      {!isLoggedIn ? (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("rsvpLoginPrompt")}
          </Typography>
          <Button href="/login" variant="contained" sx={{ fontWeight: 700, borderRadius: 2 }}>
            {t("rsvpLoginCta")}
          </Button>
        </Box>
      ) : isPast ? (
        <Typography variant="body2" color="text.secondary">
          {t("rsvpClosed")}
        </Typography>
      ) : (
        <RsvpForm {...form} onGoingChange={setGoingCount} />
      )}
    </Paper>
  );
}
