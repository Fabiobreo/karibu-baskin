"use client";
import { type ReactNode, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Tab, Tabs } from "@mui/material";
import { useTranslations } from "next-intl";

type TabKey = "profilo" | "famiglia" | "notifiche" | "privacy";

interface ProfileTabsProps {
  /** Tab Profilo: card principale + dati atleta + presenze */
  profile: ReactNode;
  /** Tab Famiglia (solo PARENT/ADMIN): gestione figli */
  family?: ReactNode | null;
  /** Tab Notifiche: preferenze notifiche */
  notifications: ReactNode;
  /** Tab Privacy: export e cancellazione dati (GDPR) */
  privacy: ReactNode;
}

/**
 * Organizza il profilo in tab. Deep-link via ?tab= (es. /profilo?tab=famiglia).
 */
export default function ProfileTabs({ profile, family, notifications, privacy }: ProfileTabsProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const searchParams = useSearchParams();

  const validTabs: TabKey[] = family
    ? ["profilo", "famiglia", "notifiche", "privacy"]
    : ["profilo", "notifiche", "privacy"];

  const requested = searchParams.get("tab") as TabKey | null;
  const [tab, setTab] = useState<TabKey>(
    requested && validTabs.includes(requested) ? requested : "profilo"
  );

  function handleChange(_: unknown, value: TabKey) {
    setTab(value);
    router.replace(value === "profilo" ? "/profilo" : `/profilo?tab=${value}`, { scroll: false });
  }

  const tabSx = { fontWeight: 700, textTransform: "none", fontSize: "0.875rem" } as const;

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={handleChange}
        variant="scrollable"
        allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}
      >
        <Tab value="profilo" label={t("tabProfile")} sx={tabSx} />
        {family && <Tab value="famiglia" label={t("tabFamily")} sx={tabSx} />}
        <Tab value="notifiche" label={t("tabNotifications")} sx={tabSx} />
        <Tab value="privacy" label={t("tabPrivacy")} sx={tabSx} />
      </Tabs>

      {tab === "profilo" && profile}
      {tab === "famiglia" && family}
      {tab === "notifiche" && notifications}
      {tab === "privacy" && privacy}
    </Box>
  );
}
