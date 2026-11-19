import { Box, Container } from "@mui/material";
import { getTranslations } from "next-intl/server";
import PageHero from "@/components/common/PageHero";
import MembersOnlyNotice from "@/components/common/MembersOnlyNotice";
import { auth } from "@/lib/authjs";
import {
  boardViewer,
  countMembersOnlyExercises,
  isMemberViewer,
  loadBoardLibrary,
} from "@/lib/board/loadBoard";
import type { DrillCategory } from "@/lib/board/category";
import { columnSx } from "@/lib/layout";
import BoardLibrary from "./BoardLibrary";
import PlaybookSectionNav from "./PlaybookSectionNav";

/**
 * Una delle due pagine del Playbook (UX-72). Esercizi: chiunque vede quelli
 * resi pubblici, i tesserati anche gli altri (e chi non lo e' legge che ci
 * sono). Schemi: solo i tesserati; agli altri l'avviso, nessuno schema nel
 * payload.
 */
export default async function PlaybookListPage({ category }: { category: DrillCategory }) {
  const [session, t] = await Promise.all([auth(), getTranslations("board")]);
  const viewer = boardViewer(session?.user?.appRole, !!session?.user);
  const member = isMemberViewer(viewer);
  const outsider = viewer === "guest" ? "guest" : "anonymous";

  const showList = category === "exercises" || member;
  const [drills, hidden] = await Promise.all([
    showList ? loadBoardLibrary(category, member) : Promise.resolve(null),
    category === "exercises" && !member ? countMembersOnlyExercises() : Promise.resolve(0),
  ]);

  return (
    <>
      <PageHero
        title={t("title")}
        subtitle={category === "exercises" ? t("subtitleExercises") : t("subtitlePlays")}
        nav={<PlaybookSectionNav current={category} />}
        column="full"
      />
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Box sx={columnSx("full")}>
          {drills ? (
            <BoardLibrary
              drills={drills}
              emptyText={category === "exercises" ? t("emptyExercises") : t("empty")}
            />
          ) : (
            <MembersOnlyNotice viewer={outsider} what="board" variant="block" />
          )}
          {hidden > 0 && (
            <Box sx={{ mt: 3 }}>
              <MembersOnlyNotice viewer={outsider} what="moreExercises" />
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
}
