"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Stack,
  Checkbox,
  FormControlLabel,
  FormGroup,
  TextField,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CancelIcon from "@mui/icons-material/Cancel";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import CloseIcon from "@mui/icons-material/Close";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
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

const STATUS_OPTIONS: {
  value: Status;
  icon: React.ReactNode;
  color: "success" | "warning" | "error";
}[] = [
  { value: "GOING", icon: <CheckCircleIcon fontSize="small" />, color: "success" },
  { value: "MAYBE", icon: <HelpOutlineIcon fontSize="small" />, color: "warning" },
  { value: "NOT_GOING", icon: <CancelIcon fontSize="small" />, color: "error" },
];

// Ci sarò / Forse / Non ci sarò. Ripremere lo stato scelto lo toglie: la
// persona torna "senza risposta".
function StatusButtons({
  value,
  disabled,
  onChange,
}: {
  value: Status | null;
  disabled: boolean;
  onChange: (status: Status | null) => void;
}) {
  const t = useTranslations("events");
  const label = (s: Status) =>
    s === "GOING" ? t("going") : s === "MAYBE" ? t("maybe") : t("notGoing");
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {STATUS_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <Button
            key={opt.value}
            size="small"
            variant={selected ? "contained" : "outlined"}
            color={selected ? opt.color : "inherit"}
            startIcon={opt.icon}
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : opt.value)}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
          >
            {label(opt.value)}
          </Button>
        );
      })}
    </Box>
  );
}

// Esterno: o viene all'evento o solo agli extra. "Forse" non serve e "No"
// non ha senso: un esterno che non viene si toglie.
function GuestChoice({
  value,
  disabled,
  onChange,
}: {
  value: Status;
  disabled: boolean;
  onChange: (status: Status) => void;
}) {
  const t = useTranslations("events");
  const choices: { value: Status; label: string; icon: React.ReactNode }[] = [
    { value: "GOING", label: t("going"), icon: <CheckCircleIcon fontSize="small" /> },
    { value: "NOT_GOING", label: t("onlyExtras"), icon: <PlaylistAddCheckIcon fontSize="small" /> },
  ];
  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      {choices.map((c) => {
        const selected = value === c.value;
        return (
          <Button
            key={c.value}
            size="small"
            variant={selected ? "contained" : "outlined"}
            color={selected ? "success" : "inherit"}
            startIcon={c.icon}
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(c.value)}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
          >
            {c.label}
          </Button>
        );
      })}
    </Box>
  );
}

// Titolo di sezione del modulo: dice cosa si sta chiedendo.
function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={800}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>
  );
}

// Stato del modulo: una riga per persona della famiglia e una per esterno.
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
    status: g.status,
    optionIds: g.optionIds,
    note: g.note ?? "",
    noteOpen: !!g.note,
  }));

function NoteField({
  open,
  value,
  disabled,
  onOpen,
  onChange,
}: {
  open: boolean;
  value: string;
  disabled: boolean;
  onOpen: () => void;
  onChange: (v: string) => void;
}) {
  const t = useTranslations("events");
  if (!open) {
    return (
      <Button
        size="small"
        startIcon={<StickyNote2OutlinedIcon fontSize="small" />}
        onClick={onOpen}
        disabled={disabled}
        sx={{ alignSelf: "flex-start", textTransform: "none", color: "text.secondary" }}
      >
        {t("addNote")}
      </Button>
    );
  }
  return (
    <TextField
      fullWidth
      size="small"
      multiline
      minRows={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={t("notePlaceholder")}
      disabled={disabled}
    />
  );
}

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
  const dl = useActiveDateLocale();
  const [members, setMembers] = useState(initialMembers);
  const [people, setPeople] = useState(() => toPeople(initialMembers));
  const [guests, setGuests] = useState(() => toGuests(initialGuests));
  const [nextGuest, setNextGuest] = useState(1);

  const guestLabel = (g: GuestDraft, i: number) =>
    g.name.trim() || t("guestFallback", { n: i + 1 });
  const canAddGuest = allowGuests && (maxGuests === null || guests.length < maxGuests);

  const setPerson = (key: string, patch: Partial<PersonDraft>) =>
    setPeople((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  const setGuest = (localKey: string, patch: Partial<GuestDraft>) =>
    setGuests((gs) => gs.map((g) => (g.localKey === localKey ? { ...g, ...patch } : g)));
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  // Chi ha spuntato un extra deve dire anche se viene all'evento
  // ("solo pranzo" = Non ci sarò + Pranzo).
  const missingStatus = members.find(
    (m) => !people[m.key].status && people[m.key].optionIds.length > 0
  );
  const hasExtras = options.length > 0;
  const guestWithoutExtras = guests.findIndex(
    (g) => hasExtras && g.status === "NOT_GOING" && g.optionIds.length === 0
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          people: members.map((m) => ({
            key: m.key,
            status: people[m.key].status,
            optionIds: people[m.key].optionIds,
            note: people[m.key].note.trim() || null,
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
      return (await res.json()) as { members: MemberRsvp[]; guests: GuestRsvp[]; going: number };
    },
    onSuccess: (state) => {
      // Si riparte dallo stato salvato: id degli esterni nuovi, "risposto da".
      setMembers(state.members);
      setPeople(toPeople(state.members));
      setGuests(toGuests(state.guests));
      onGoingChange(state.going);
      showToast({ message: t("saved"), severity: "success" });
    },
    // L'errore resta sotto "Salva" (UX-25).
  });
  const busy = mutation.isPending;

  const everyone = [
    ...members.map((m) => ({
      key: m.key as string,
      label: m.isSelf ? t("me") : m.name,
      checked: (id: string) => people[m.key].optionIds.includes(id),
      onToggle: (id: string) =>
        setPerson(m.key, { optionIds: toggle(people[m.key].optionIds, id) }),
    })),
    ...guests.map((g, i) => ({
      key: g.localKey,
      label: guestLabel(g, i),
      checked: (id: string) => g.optionIds.includes(id),
      onToggle: (id: string) => setGuest(g.localKey, { optionIds: toggle(g.optionIds, id) }),
    })),
  ];

  return (
    <Stack spacing={3}>
      {/* ── Evento principale ── */}
      {hasExtras && <SectionTitle title={t("mainEvent")} />}
      <Stack spacing={2} divider={<Divider flexItem />}>
        {members.map((m) => {
          const p = people[m.key];
          return (
            <Stack key={m.key} spacing={1}>
              <Box>
                <Typography variant="subtitle2" fontWeight={800}>
                  {m.isSelf ? t("me") : m.name}
                </Typography>
                {m.respondedByName && (
                  <Typography variant="caption" color="text.secondary">
                    {t("respondedBy", { name: m.respondedByName })}
                  </Typography>
                )}
              </Box>
              <StatusButtons
                value={p.status}
                disabled={busy}
                onChange={(status) => setPerson(m.key, { status })}
              />
              <NoteField
                open={p.noteOpen}
                value={p.note}
                disabled={busy}
                onOpen={() => setPerson(m.key, { noteOpen: true })}
                onChange={(note) => setPerson(m.key, { note })}
              />
            </Stack>
          );
        })}

        {guests.map((g, i) => (
          <Stack key={g.localKey} spacing={1}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                size="small"
                value={g.name}
                onChange={(e) => setGuest(g.localKey, { name: e.target.value })}
                placeholder={t("guestFallback", { n: i + 1 })}
                label={t("guestName")}
                disabled={busy}
                slotProps={{ htmlInput: { maxLength: 80 } }}
                sx={{ flex: 1, maxWidth: 320 }}
              />
              <Tooltip title={t("removeGuest", { name: guestLabel(g, i) })}>
                <IconButton
                  aria-label={t("removeGuest", { name: guestLabel(g, i) })}
                  onClick={() => setGuests((gs) => gs.filter((x) => x.localKey !== g.localKey))}
                  disabled={busy}
                  sx={TOUCH_TARGET_MIN}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            {hasExtras && (
              <GuestChoice
                value={g.status === "NOT_GOING" ? "NOT_GOING" : "GOING"}
                disabled={busy}
                onChange={(status) => setGuest(g.localKey, { status })}
              />
            )}
            <NoteField
              open={g.noteOpen}
              value={g.note}
              disabled={busy}
              onOpen={() => setGuest(g.localKey, { noteOpen: true })}
              onChange={(note) => setGuest(g.localKey, { note })}
            />
          </Stack>
        ))}
      </Stack>

      {allowGuests && (
        <Box>
          {canAddGuest && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<PersonAddAltIcon />}
              disabled={busy}
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
              sx={{ fontWeight: 700, borderRadius: 2, textTransform: "none" }}
            >
              {t("addGuest")}
            </Button>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
            {t("guestsHint")}
          </Typography>
        </Box>
      )}

      {/* ── Extra: chi partecipa a ciascuno. Il totale lo danno le spunte. ── */}
      {options.length > 0 && (
        <Stack spacing={2}>
          <SectionTitle title={t("extras")} hint={t("optionsHint")} />
          {options.map((o) => {
            const count = everyone.filter((e) => e.checked(o.id)).length;
            return (
              <Box key={o.id}>
                <Typography variant="subtitle2" fontWeight={800}>
                  {o.label}
                  <Typography component="span" variant="body2" color="text.secondary">
                    {" · "}
                    {t("optionCount", { count })}
                  </Typography>
                </Typography>
                {o.startsAt && (
                  <Typography variant="caption" color="text.secondary">
                    {formatRome(o.startsAt, "EEE d MMM, HH:mm", { locale: dl })}
                  </Typography>
                )}
                <FormGroup row>
                  {everyone.map((e) => (
                    <FormControlLabel
                      key={e.key}
                      control={
                        <Checkbox
                          checked={e.checked(o.id)}
                          onChange={() => e.onToggle(o.id)}
                          disabled={busy}
                        />
                      }
                      label={e.label}
                    />
                  ))}
                </FormGroup>
              </Box>
            );
          })}
        </Stack>
      )}

      <Box>
        <Button
          variant="contained"
          disabled={busy || !!missingStatus || guestWithoutExtras >= 0}
          onClick={() => mutation.mutate()}
          sx={{ fontWeight: 700, borderRadius: 2 }}
        >
          {t("save")}
        </Button>
        {!missingStatus && guestWithoutExtras >= 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
            {t("guestExtrasNeeded", {
              name: guestLabel(guests[guestWithoutExtras], guestWithoutExtras),
            })}
          </Typography>
        )}
        {missingStatus && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
            {missingStatus.isSelf
              ? t("statusNeededSelf")
              : t("statusNeeded", { name: missingStatus.name })}
          </Typography>
        )}
        {mutation.isError && (
          <InlineError
            title={t("rsvpNotSaved")}
            message={mutation.error instanceof Error ? mutation.error.message : t("saveError")}
            onRetry={() => mutation.mutate()}
            onClose={() => mutation.reset()}
            retrying={busy}
          />
        )}
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
        <Typography variant="subtitle1" fontWeight={800}>
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
