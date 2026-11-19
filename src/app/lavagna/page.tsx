import { Box, Container } from "@mui/material";
import { getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import MembersOnlyNotice from "@/components/common/MembersOnlyNotice";
import BoardLibrary from "@/components/board/BoardLibrary";
import { auth } from "@/lib/authjs";
import { boardViewer, loadBoardLibrary } from "@/lib/board/loadBoard";
import { columnSx } from "@/lib/layout";
import { buildMetadata } from "@/lib/seo";

// Contenuti del club per i suoi tesserati: mai su Google, mai in sitemap.
export const metadata = buildMetadata({
  title: "Lavagna",
  description: "Schemi ed esercizi del Karibu Baskin, per atleti, famiglie e staff.",
  path: "/lavagna",
  noindex: true,
});

/**
 * Lavagna (UX-72): gli schemi pubblicati, per tutti i tesserati. Anonimi e
 * ospiti leggono solo chi la vede e come entrare: nessuno schema nel payload.
 */
export default async function LavagnaPage() {
  const [session, t] = await Promise.all([auth(), getTranslations("board")]);
  const viewer = boardViewer(session?.user?.appRole, !!session?.user);
  const drills = viewer === "member" || viewer === "staff" ? await loadBoardLibrary() : null;

  return (
    <>
      <PageHero title={t("title")} subtitle={t("subtitle")} column="full" />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={columnSx("full")}>
          {drills ? (
            <BoardLibrary drills={drills} />
          ) : (
            <MembersOnlyNotice
              viewer={viewer === "guest" ? "guest" : "anonymous"}
              what="board"
              variant="block"
            />
          )}
        </Box>
      </Container>
    </>
  );
}
