import { Box, Button, Container, Link as MuiLink, Typography } from "@mui/material";
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
import { loadMyProposals } from "@/lib/board/loadProposals";
import { canPropose, proposalEditPath } from "@/lib/board/proposals";
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
  // Proporre un esercizio (UX-73): i tesserati, nella pagina degli esercizi.
  const proposer =
    category === "exercises" && !!session?.user?.id && canPropose(session.user.appRole);
  const [drills, hidden, mine] = await Promise.all([
    showList ? loadBoardLibrary(category, member) : Promise.resolve(null),
    category === "exercises" && !member ? countMembersOnlyExercises() : Promise.resolve(0),
    proposer ? loadMyProposals(session!.user!.id!) : Promise.resolve([]),
  ]);
  // Quelle gia' nel Playbook sono nella libreria: qui le altre.
  const myOpen = mine.filter((p) => p.state !== "published");

  return (
    <>
      <PageHero
        title={t("title")}
        subtitle={category === "exercises" ? t("subtitleExercises") : t("subtitlePlays")}
        nav={<PlaybookSectionNav current={category} />}
        action={
          proposer ? (
            <Button href={proposalEditPath()} variant="outlined" color="inherit">
              {t("proposal.propose")}
            </Button>
          ) : undefined
        }
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
          {myOpen.length > 0 && (
            <Box component="section" sx={{ mt: 5 }}>
              <Typography variant="h4" component="h2" sx={{ mb: 1.5 }}>
                {t("proposal.yourProposals")}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 3, display: "grid", gap: 0.75 }}>
                {myOpen.map((p) => (
                  <li key={p.id}>
                    <MuiLink href={proposalEditPath(p.id)}>{p.title}</MuiLink>
                    <Typography component="span" variant="body2" color="text.secondary">
                      {" · "}
                      {t(`proposal.states.${p.state}`)}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Box>
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
