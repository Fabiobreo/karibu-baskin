"use client";
import { Box, Button, Link as MuiLink, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { loginHref } from "@/lib/loginReturn";

/** Cosa resta nascosto: decide la parola nella frase ("i nomi", "le squadre"…). */
export type MembersOnlySubject = "names" | "teams" | "callups" | "albums" | "photos";

interface MembersOnlyNoticeProps {
  /** `anonymous` = senza accesso (gli si chiede di accedere); `guest` = account in attesa di conferma. */
  viewer: "anonymous" | "guest";
  what: MembersOnlySubject;
  /** Una riga di testo (default) o un riquadro con lucchetto, titolo e bottone. */
  variant?: "inline" | "block";
  /** Dove tornare dopo l'accesso; di default la pagina corrente, con i parametri. */
  returnTo?: string;
  /**
   * `false` quando nella stessa schermata c'è già un invito ad accedere (il
   * modulo d'iscrizione): l'avviso dice solo chi vede, senza un secondo "Accedi".
   */
  withLogin?: boolean;
}

/**
 * L'unico avviso per quello che vedono solo i tesserati (nomi degli iscritti,
 * squadre, convocati, album riservati).
 *
 * La parola "tesserati" non si usa: i genitori non sono tesserati e non si
 * riconoscevano nell'avviso, e chi era tesserato non capiva che serviva
 * l'accesso all'app (suggerimenti del 15 e del 17/10/2026). La frase dice chi
 * vede ("atleti, famiglie e staff del Karibu") e cosa fare: accedere, oppure,
 * per chi l'accesso l'ha già fatto, aspettare la conferma dello staff. A
 * quest'ultimo non si mostra "Accedi", che non gli servirebbe a niente.
 */
export default function MembersOnlyNotice({
  viewer,
  what,
  variant = "inline",
  returnTo,
  withLogin = true,
}: MembersOnlyNoticeProps) {
  const t = useTranslations("membersOnly");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString();
  const href = loginHref(returnTo ?? `${pathname ?? "/"}${query ? `?${query}` : ""}`);
  const askLogin = viewer === "anonymous" && withLogin;
  const subject = t(`what.${what}`);
  const text =
    viewer === "guest" ? t("guest", { what: subject }) : t("anonymous", { what: subject });

  if (variant === "block") {
    return (
      <Box sx={{ textAlign: "center", py: { xs: 5, md: 8 }, px: 2 }}>
        <LockOutlinedIcon sx={{ fontSize: 44, color: "text.secondary", mb: 1.5 }} />
        <Typography variant="h6" component="p" color="text.primary">
          {t("title")}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, mb: askLogin ? 2.5 : 0, maxWidth: 400, mx: "auto" }}
        >
          {text}
          {askLogin && ` ${t("askLogin")}`}
        </Typography>
        {askLogin && (
          <Button href={href} variant="contained" size="large">
            {t("login")}
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      {text}
      {askLogin && (
        <>
          {" "}
          {t("askLogin")} <MuiLink href={href}>{t("login")}</MuiLink>
        </>
      )}
    </Typography>
  );
}
