"use client";
import { useRef, useState } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { QuizArt } from "@/lib/games/gameArt";
import QuizQuestionStep from "@/components/games/QuizQuestionStep";
import QuizResult from "@/components/games/QuizResult";
import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import {
  challengeSeed,
  nextSeen,
  pickFreshCode,
  pickRound,
  quizPath,
  quizSeenStorageKey,
} from "@/lib/games/quiz";
import { useHasMounted } from "@/lib/useHasMounted";

interface BaskinQuizProps {
  /** Quiz giocato (UX-67): id per statistiche e migliore partita, indirizzo e titolo per la sfida. */
  quizId: string;
  slug: string;
  title: string;
  bank: QuizQuestion[];
  /** Tesserato con l'accesso: si salva la sua migliore partita. */
  member: boolean;
  initialBest: number | null;
  /** Arrivo da un link di sfida: stesse domande di chi l'ha mandato. */
  challenge: { code: string; score: number | null } | null;
  /** Quiz solo per i tesserati (UX-66). */
  membersOnly: boolean;
  /** Anteprima dello staff: la partita non si conta e non si salva. */
  preview: boolean;
  /** Disegno del quiz, sulla testata delle domande (UX-70). */
  art: QuizArt;
  /** Domande per partita di questo quiz, scelte dall'admin. */
  length: number;
}

interface Game {
  code: string;
  questions: QuizQuestion[];
  picks: (number | null)[];
  confirmed: boolean[];
  index: number;
  done: boolean;
  challengerScore: number | null;
}

function readSeen(quizId: string): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(quizSeenStorageKey(quizId));
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSeen(quizId: string, seen: Set<string>) {
  try {
    window.sessionStorage.setItem(quizSeenStorageKey(quizId), JSON.stringify([...seen]));
  } catch {
    // Navigazione privata o memoria piena: si gioca lo stesso.
  }
}

function newGame(
  bank: QuizQuestion[],
  length: number,
  code: string,
  challengerScore: number | null
): Game {
  const questions = pickRound(bank, challengeSeed(code), length);
  return {
    code,
    questions,
    picks: questions.map(() => null),
    confirmed: questions.map(() => false),
    index: 0,
    done: false,
    challengerScore,
  };
}

/**
 * Partita di un quiz del club (UX-61, UX-67). Le domande dipendono da
 * `sessionStorage` (quelle già fatte in questa visita), quindi il gioco parte
 * solo nel browser.
 */
export default function BaskinQuiz(props: BaskinQuizProps) {
  const mounted = useHasMounted();
  const t = useTranslations("pages.games.quiz");
  if (!mounted) {
    return (
      <Box aria-busy="true">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("loading")}
        </Typography>
        <Skeleton variant="rounded" height={280} />
      </Box>
    );
  }
  return <QuizGame {...props} />;
}

function QuizGame({
  quizId,
  slug,
  title,
  bank,
  member,
  initialBest,
  challenge,
  membersOnly,
  preview,
  art,
  length,
}: BaskinQuizProps) {
  const t = useTranslations("pages.games.quiz");
  const router = useRouter();
  const [game, setGame] = useState<Game>(() =>
    challenge
      ? newGame(bank, length, challenge.code, challenge.score)
      : newGame(bank, length, pickFreshCode(bank, readSeen(quizId), new Set(), length), null)
  );
  const [best, setBest] = useState(initialBest);
  // Una partita finita si conta una volta sola, anche tornando indietro.
  const countedRef = useRef<string | null>(null);

  // Fine partita: il contatore del giorno e, per ogni domanda, se la risposta
  // era giusta (UX-67). Il server ricontrolla le risposte; nessun dato di chi gioca.
  const played = useMutation({
    mutationFn: (answers: { id: string; pick: number }[]) =>
      fetch("/api/games/quiz/played", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, answers }),
      }),
  });
  const saveBest = useMutation({
    mutationFn: async (score: number) => {
      const res = await fetch("/api/users/me/quiz-best", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId, score }),
      });
      if (!res.ok) return null;
      const data: { best: number } = await res.json();
      return data.best;
    },
    onSuccess: (value) => {
      if (value !== null) setBest(value);
    },
  });

  const question = game.questions[game.index];

  function finish() {
    setGame((g) => ({ ...g, done: true }));
    if (countedRef.current === game.code) return;
    countedRef.current = game.code;
    const score = game.questions.filter((q, i) => game.picks[i] === q.correct).length;
    writeSeen(quizId, nextSeen(bank, readSeen(quizId), game.questions, length));
    // L'anteprima dello staff (anche domande in prova) non conta e non si salva.
    if (preview) return;
    played.mutate(
      game.questions.flatMap((q, i) => {
        const pick = game.picks[i];
        return pick === null ? [] : [{ id: q.id, pick }];
      })
    );
    if (member) saveBest.mutate(score);
  }

  function playAgain() {
    const last = new Set(game.questions.map((q) => q.id));
    setGame(newGame(bank, length, pickFreshCode(bank, readSeen(quizId), last, length), null));
    // Fuori dal link di sfida: la partita nuova non è più quella di chi ha sfidato.
    if (challenge) router.replace(quizPath(slug), { scroll: false });
    window.scrollTo({ top: 0 });
  }

  if (game.done) {
    return (
      <QuizResult
        questions={game.questions}
        picks={game.picks}
        code={game.code}
        challengerScore={game.challengerScore}
        best={member ? best : null}
        onPlayAgain={playAgain}
        membersOnly={membersOnly}
        slug={slug}
        title={title}
        art={art}
      />
    );
  }

  return (
    <Box>
      {challenge && game.code === challenge.code && (
        <Typography variant="body1" sx={{ mb: 2 }}>
          {t("challengeIntro")}
        </Typography>
      )}
      <QuizQuestionStep
        key={question.id}
        question={question}
        index={game.index}
        results={game.questions.map((q, i) =>
          game.confirmed[i] ? game.picks[i] === q.correct : null
        )}
        pick={game.confirmed[game.index] ? game.picks[game.index] : null}
        art={art}
        isLast={game.index === game.questions.length - 1}
        // Un tocco è la risposta (UX-70): niente "Conferma", e non si cambia.
        onPick={(answer) =>
          setGame((g) =>
            g.confirmed[g.index]
              ? g
              : {
                  ...g,
                  picks: g.picks.map((p, i) => (i === g.index ? answer : p)),
                  confirmed: g.confirmed.map((c, i) => (i === g.index ? true : c)),
                }
          )
        }
        onNext={() =>
          game.index === game.questions.length - 1
            ? finish()
            : setGame((g) => ({ ...g, index: g.index + 1 }))
        }
      />
    </Box>
  );
}
