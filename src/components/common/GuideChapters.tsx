"use client";
import { useState, useSyncExternalStore } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LoginIcon from "@mui/icons-material/Login";
import InstallMobileIcon from "@mui/icons-material/InstallMobile";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import FamilyRestroomIcon from "@mui/icons-material/FamilyRestroom";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import QuizIcon from "@mui/icons-material/Quiz";
import SportsBasketballIcon from "@mui/icons-material/SportsBasketball";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import CelebrationIcon from "@mui/icons-material/Celebration";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useTranslations } from "next-intl";
import GuideInstall from "@/components/common/GuideInstall";
import type { Guide, GuideIcon } from "@/lib/content/guide";
import { TYPE_SCALE } from "@/lib/typeScale";

const ICONS: Record<GuideIcon, React.ReactNode> = {
  login: <LoginIcon />,
  install: <InstallMobileIcon />,
  notifications: <NotificationsActiveIcon />,
  family: <FamilyRestroomIcon />,
  pending: <HourglassTopIcon />,
  role: <QuizIcon />,
  training: <SportsBasketballIcon />,
  match: <EventAvailableIcon />,
  event: <CelebrationIcon />,
  calendar: <CalendarMonthIcon />,
  news: <NewspaperIcon />,
  profile: <AccountCircleIcon />,
  privacy: <VisibilityIcon />,
  help: <HelpOutlineIcon />,
};

const sectionTitleSx = {
  mt: 0.5,
  mb: 1.5,
  fontSize: { xs: TYPE_SCALE.xl2, md: TYPE_SCALE.xl3 },
} as const;

const itemSx = { lineHeight: 1.6, mb: 0.75 } as const;

// Il capitolo indicato dall'ancora (`/guida#notifiche`) si apre da solo.
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
// Le ancore sono ASCII: niente decodifica, che su un link rotto solleverebbe.
const readHash = () => window.location.hash.slice(1);
const noHash = () => "";

interface GuideChaptersProps {
  guide: Guide;
}

/**
 * Corpo della guida all'app: i tre passi iniziali e i capitoli richiudibili.
 * Ogni capitolo ha un'ancora, cosi' lo staff puo' rispondere a una domanda
 * con un link preciso.
 */
export default function GuideChapters({ guide }: GuideChaptersProps) {
  const t = useTranslations("pages");
  const hashId = useSyncExternalStore(subscribeHash, readHash, noHash);
  // Aperture e chiusure fatte a mano vincono sull'ancora.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => toggled[id] ?? id === hashId;
  const setOpen = (id: string, open: boolean) => setToggled((prev) => ({ ...prev, [id]: open }));

  return (
    <Stack spacing={{ xs: 4, md: 5 }}>
      <Box component="section">
        <Typography variant="overline" color="text.secondary">
          {t("guida.startOverline")}
        </Typography>
        <Typography variant="h4" component="h2" sx={sectionTitleSx}>
          {t("guida.startTitle")}
        </Typography>
        {/* `role`: senza i numeri di lista VoiceOver non la legge più come elenco. */}
        <Stack component="ol" role="list" spacing={2} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {guide.start.map((step, i) => (
            <Box component="li" key={step.chapterId} sx={{ display: "flex", gap: 1.5 }}>
              <Typography
                component="span"
                aria-hidden="true"
                variant="h5"
                sx={{ width: 24, flexShrink: 0, color: "text.secondary", lineHeight: 1.3 }}
              >
                {i + 1}
              </Typography>
              <Box>
                <Typography variant="subtitle1" component="h3">
                  {step.title}
                </Typography>
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  {step.text}{" "}
                  <MuiLink
                    href={`#${step.chapterId}`}
                    // Tre link con lo stesso testo: il nome dice anche di quale passo.
                    aria-label={`${t("guida.howTo")}: ${step.title}`}
                    onClick={() => setOpen(step.chapterId, true)}
                    sx={{ color: "primary.onLight", whiteSpace: "nowrap" }}
                  >
                    {t("guida.howTo")}
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {guide.groups.map((group) => (
        <Box component="section" key={group.title}>
          <Typography variant="h4" component="h2" sx={sectionTitleSx}>
            {group.title}
          </Typography>
          <Box>
            {group.chapters.map((chapter) => (
              <Accordion
                key={chapter.id}
                id={chapter.id}
                expanded={isOpen(chapter.id)}
                onChange={(_e, open) => setOpen(chapter.id, open)}
                disableGutters
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  "&:not(:last-child)": { borderBottom: 0 },
                  "&::before": { display: "none" },
                  // L'header del sito resta in alto: l'ancora non ci finisce sotto.
                  scrollMarginTop: 88,
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls={`${chapter.id}-content`}
                  id={`${chapter.id}-header`}
                  sx={{ minHeight: 56 }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                      aria-hidden="true"
                      sx={{ display: "flex", color: "primary.main", flexShrink: 0 }}
                    >
                      {ICONS[chapter.icon]}
                    </Box>
                    <Typography variant="subtitle1" component="span">
                      {chapter.title}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Box component="ul" sx={{ m: 0, mb: 1.5, pl: 2.5 }}>
                    {chapter.steps.map((step) => (
                      <Typography key={step} component="li" variant="body1" sx={itemSx}>
                        {step}
                      </Typography>
                    ))}
                  </Box>
                  {chapter.install && (
                    <Box sx={{ mb: 2 }}>
                      <GuideInstall android={chapter.install.android} ios={chapter.install.ios} />
                    </Box>
                  )}
                  {chapter.note && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.6, mb: chapter.links ? 2 : 0 }}
                    >
                      {chapter.note}
                    </Typography>
                  )}
                  {chapter.links && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {chapter.links.map((link) => (
                        <Button key={link.href} href={link.href} variant="outlined">
                          {link.label}
                        </Button>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
