"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import CheckIcon from "@mui/icons-material/Check";
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

interface PersonDraft {
  status: Status | null;
  optionIds: string[];
  note: string;
  noteOpen: boolean;
}
interface GuestDraft extends Omit<PersonDraft, "status"> {
  /** Chiave locale stabile anche per gli esterni non ancora salvati. */
  localKey: string;
  id?: string;
  name: string;
  status: Status;
}
interface SavedState {
  members: MemberRsvp[];
  guests: GuestRsvp[];
}

const toPeople = (members: MemberRsvp[]) =>
  Object.fromEntries(
    members.map((m) => [
      m.key,
      { status: m.status, optionIds: m.optionIds, note: m.note ?? "", noteOpen: !!m.note },
    ])
  ) as Record<string, PersonDraft>;

const toGuests = (guests: GuestRsvp[]): GuestDraft[] =>
  guests.map((g) => ({
    localKey: g.id,
    id: g.id,
    name: g.name ?? "",
    status: g.status === "NOT_GOING" ? "NOT_GOING" : "GOING",
    optionIds: g.optionIds,
    note: g.note ?? "",
    noteOpen: !!g.note,
  }));

// Confronto per "modifiche non salvate": solo cio' che si invia.
const fingerprint = (people: Record<string, PersonDraft>, guests: GuestDraft[]) =>
  JSON.stringify([
    Object.entries(people).map(([k, p]) => [k, p.status, [...p.optionIds].sort(), p.note.trim()]),
    guests.map((g) => [
      g.id ?? "",
      g.name.trim(),
      g.status,
      [...g.optionIds].sort(),
      g.note.trim(),
    ]),
  ]);

const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

// ── Pezzi ─────────────────────────────────────────────────────────────────────

/**
 * Scelta a segmenti: una riga sola, lo stato scelto ben visibile. Ripremere la
 * voce scelta la toglie ("Da rispondere"), e la scheda lo scrive.
 */
function Segmented<T extends string>({
  value,
  choices,
  label,
  disabled,
  allowEmpty,
  onChange,
}: {
  value: T | null;
  choices: { value: T; label: string }[];
  label: string;
  disabled: boolean;
  allowEmpty: boolean;
  onChange: (value: T | null) => void;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(_e, v: T | null) => (v !== null || allowEmpty) && onChange(v)}
      sx={{
        "& .MuiToggleButton-root": {
          textTransform: "none",
          fontWeight: 700,
          py: 0.75,
          minHeight: 40,
        },
        "& .MuiToggleButton-root.Mui-selected": {
          bgcolor: "primary.fill",
          color: "common.white",
          "&:hover": { bgcolor: "primary.dark" },
        },
      }}
    >
      {choices.map((c) => (
        <ToggleButton key={c.value} value={c.value}>
          {c.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function ExtraChips({
  options,
  selected,
  disabled,
  onToggle,
}: {
  options: EventOptionView[];
  selected: string[];
  disabled: boolean;
  onToggle: (id: string) => void;
}) {
  const dl = useActiveDateLocale();
  if (options.length === 0) return null;
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {options.map((o) => {
        const on = selected.includes(o.id);
        const when = o.startsAt ? formatRome(o.startsAt, "EEE HH:mm", { locale: dl }) : null;
        return (
          <Chip
            key={o.id}
            label={when ? `${o.label} · ${when}` : o.label}
            icon={on ? <CheckIcon /> : undefined}
            variant={on ? "filled" : "outlined"}
            onClick={() => onToggle(o.id)}
            disabled={disabled}
            aria-pressed={on}
            // Stesso arancio dei segmenti scelti: "scelto" si legge uguale ovunque.
            sx={{
              fontWeight: 700,
              ...(on && {
                bgcolor: "primary.fill",
                color: "common.white",
                "& .MuiChip-icon": { color: "common.white" },
                "&:hover": { bgcolor: "primary.dark" },
              }),
            }}
          />
        );
      })}
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
        gap: 1.25,
        minWidth: 0,
      }}
    >
      {header}
      {children}
    </Box>
  );
}

// ── Riepilogo dopo il salvataggio ─────────────────────────────────────────────

function summaryText(
  t: ReturnType<typeof useTranslations>,
  status: Status | null,
  optionIds: string[],
  options: EventOptionView[],
  guest: boolean
): string | null {
  const extras = options.filter((o) => optionIds.includes(o.id)).map((o) => o.label);
  if (!status) return null;
  if (status === "NOT_GOING") {
    // "Solo pranzo": dentro una frase l'etichetta perde la maiuscola.
    const list = extras.map((e) => e.charAt(0).toLowerCase() + e.slice(1)).join(", ");
    return extras.length ? t("onlyList", { list }) : t("summaryNo");
  }
  const base = status === "GOING" ? (guest ? t("summaryGuestYes") : t("summaryYes")) : t("maybe");
  return [base, ...extras].join(" · ");
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
  const going =
    saved.members.filter((m) => m.status === "GOING").length +
    saved.guests.filter((g) => g.status === "GOING").length;
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
        <Typography variant="caption">
          {footerSummary(t, saved.members, saved.guests, options, going)}
        </Typography>
      </Alert>
      <Box>
        {[
          ...saved.members.map((m) => ({
            key: m.key as string,
            name: m.isSelf ? t("me") : m.name,
            guest: false,
            text: summaryText(t, m.status, m.optionIds, options, false),
          })),
          ...saved.guests.map((g, i) => ({
            key: g.id,
            name: g.name || t("guestFallback", { n: i + 1 }),
            guest: true,
            text: summaryText(t, g.status, g.optionIds, options, true),
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

function footerSummary(
  t: ReturnType<typeof useTranslations>,
  members: { status: Status | null; optionIds: string[] }[],
  guests: { status: Status; optionIds: string[] }[],
  options: EventOptionView[],
  going: number
): string {
  const all = [...members, ...guests];
  return [
    t("footerGoing", { count: going }),
    ...options.map((o) =>
      t("footerOption", {
        label: o.label,
        count: all.filter((p) => p.optionIds.includes(o.id)).length,
      })
    ),
  ].join(" · ");
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
  const [people, setPeople] = useState(() => toPeople(initialMembers));
  const [guests, setGuests] = useState(() => toGuests(initialGuests));
  const [nextGuest, setNextGuest] = useState(1);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; localKey: string } | null>(null);

  const members = saved.members;
  const hasExtras = options.length > 0;
  // Una persona sola, niente extra ne' esterni: basta Si'/Forse/No, salvato subito.
  const simple = members.length === 1 && !hasExtras && !allowGuests;
  const answeredBefore = members.some((m) => m.status) || saved.guests.length > 0;
  const [editing, setEditing] = useState(!answeredBefore);

  const dirty =
    fingerprint(people, guests) !== fingerprint(toPeople(saved.members), toGuests(saved.guests));

  // Uscire con modifiche non salvate: il browser chiede conferma.
  useEffect(() => {
    if (!dirty || simple) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, simple]);

  const setPerson = (key: string, patch: Partial<PersonDraft>) =>
    setPeople((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  const setGuest = (localKey: string, patch: Partial<GuestDraft>) =>
    setGuests((gs) => gs.map((g) => (g.localKey === localKey ? { ...g, ...patch } : g)));
  const guestLabel = (g: GuestDraft, i: number) =>
    g.name.trim() || t("guestFallback", { n: i + 1 });
  const canAddGuest = allowGuests && (maxGuests === null || guests.length < maxGuests);

  // Chi ha scelto un extra deve dire se viene all'evento; un esterno "solo
  // agli extra" deve averne almeno uno.
  const personMissing = members.find(
    (m) => !people[m.key].status && people[m.key].optionIds.length > 0
  );
  const guestMissing = guests.findIndex(
    (g) => hasExtras && g.status === "NOT_GOING" && g.optionIds.length === 0
  );
  const blocked = !!personMissing || guestMissing >= 0;

  const mutation = useMutation({
    mutationFn: async (vars?: { people: Record<string, PersonDraft> }) => {
      const source = vars?.people ?? people;
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people: members.map((m) => ({
            key: m.key,
            status: source[m.key].status,
            optionIds: source[m.key].optionIds,
            note: source[m.key].note.trim() || null,
          })),
          guests: guests.map((g) => ({
            id: g.id,
            name: g.name.trim() || null,
            // Senza extra un esterno viene e basta.
            status: hasExtras ? g.status : "GOING",
            optionIds: g.optionIds,
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
      setPeople(toPeople(state.members));
      setGuests(toGuests(state.guests));
      onGoingChange(state.going);
      if (!simple) setEditing(false);
      showToast({ message: t("saved"), severity: "success" });
    },
    // L'errore resta sotto il salvataggio (UX-25).
  });
  const busy = mutation.isPending;

  const statusChoices: { value: Status; label: string }[] = [
    { value: "GOING", label: t("yes") },
    { value: "MAYBE", label: t("maybe") },
    { value: "NOT_GOING", label: t("no") },
  ];
  const guestChoices: { value: Status; label: string }[] = [
    { value: "GOING", label: t("atEvent") },
    { value: "NOT_GOING", label: t("onlyExtras") },
  ];

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
        <Segmented
          value={people[m.key].status}
          choices={statusChoices}
          label={t("rsvpTitle")}
          disabled={busy}
          allowEmpty={false}
          onChange={(status) => {
            const next = { ...people, [m.key]: { ...people[m.key], status } };
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

  const draftGoing =
    members.filter((m) => people[m.key].status === "GOING").length +
    guests.filter((g) => !hasExtras || g.status === "GOING").length;

  return (
    <Stack spacing={2}>
      {members.length > 1 && (
        <Button
          variant="outlined"
          startIcon={<GroupsIcon />}
          disabled={busy}
          onClick={() =>
            setPeople((p) =>
              Object.fromEntries(
                Object.entries(p).map(([k, v]) => [k, { ...v, status: "GOING" as Status }])
              )
            )
          }
          sx={{ alignSelf: { xs: "stretch", sm: "flex-start" }, fontWeight: 700 }}
        >
          {t("allComing")}
        </Button>
      )}

      {/* Schede: una per persona, con tutto quello che la riguarda. */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {members.map((m) => {
          const p = people[m.key];
          const missing = !p.status && p.optionIds.length > 0;
          return (
            <PersonCard
              key={m.key}
              header={
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={800} noWrap>
                      {m.isSelf ? t("me") : m.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div">
                      {m.respondedByName
                        ? t("respondedBy", { name: m.respondedByName })
                        : !p.status
                          ? t("toAnswer")
                          : " "}
                    </Typography>
                  </Box>
                  <NoteToggle
                    open={p.noteOpen}
                    hasNote={!!p.note.trim()}
                    disabled={busy}
                    onClick={() => setPerson(m.key, { noteOpen: !p.noteOpen })}
                  />
                </Box>
              }
            >
              <Segmented
                value={p.status}
                choices={statusChoices}
                label={t("statusFor", { name: m.isSelf ? t("me") : m.name })}
                disabled={busy}
                allowEmpty
                onChange={(status) => setPerson(m.key, { status })}
              />
              <ExtraChips
                options={options}
                selected={p.optionIds}
                disabled={busy}
                onToggle={(id) => setPerson(m.key, { optionIds: toggle(p.optionIds, id) })}
              />
              {p.status === "NOT_GOING" && p.optionIds.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {t("onlyExtras")}
                </Typography>
              )}
              {missing && (
                <Typography variant="caption" color="warning.main">
                  {t("chooseYesMaybeNo")}
                </Typography>
              )}
              {p.noteOpen && (
                <TextField
                  size="small"
                  multiline
                  value={p.note}
                  onChange={(e) => setPerson(m.key, { note: e.target.value })}
                  placeholder={t("notePlaceholder")}
                  disabled={busy}
                  autoFocus={!p.note}
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
                      typography: "subtitle2",
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
            {hasExtras && (
              <Segmented
                value={g.status}
                choices={guestChoices}
                label={t("statusFor", { name: guestLabel(g, i) })}
                disabled={busy}
                allowEmpty={false}
                onChange={(status) => status && setGuest(g.localKey, { status })}
              />
            )}
            <ExtraChips
              options={options}
              selected={g.optionIds}
              disabled={busy}
              onToggle={(id) => setGuest(g.localKey, { optionIds: toggle(g.optionIds, id) })}
            />
            {guestMissing === i && (
              <Typography variant="caption" color="warning.main">
                {t("guestExtrasNeeded", { name: guestLabel(g, i) })}
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
                  status: "GOING",
                  optionIds: [],
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
              {footerSummary(t, Object.values(people), guests, options, draftGoing)}
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
                  setPeople(toPeople(saved.members));
                  setGuests(toGuests(saved.guests));
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
              disabled={busy || blocked || !dirty}
              sx={{ fontWeight: 700 }}
            >
              {t("save")}
            </Button>
          </Box>
        </Box>
        {personMissing && (
          <Typography variant="caption" color="warning.main" sx={{ display: "block", mt: 0.5 }}>
            {personMissing.isSelf
              ? t("statusNeededSelf")
              : t("statusNeeded", { name: personMissing.name })}
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
