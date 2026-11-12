"use client";
import { useRef, useState } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import QuizQuestionStep from "@/components/games/QuizQuestionStep";
import QuizResult from "@/components/games/QuizResult";
import type { QuizQuestion } from "@/lib/content/baskinQuiz";
import {
  challengeSeed,
  nextSeen,
  pickFreshCode,
  pickRound,
  QUIZ_SEEN_STORAGE_KEY,
} from "@/lib/games/quiz";
import { useHasMounted } from "@/lib/useHasMounted";

interface BaskinQuizProps {
  bank: QuizQuestion[];
  /** Tesserato con l'accesso: si salva la sua migliore partita. */
  member: boolean;
  initialBest: number | null;
  /** Arrivo da un link di sfida: stesse domande di chi l'ha mandato. */
  challenge: { code: string; score: number | null } | null;
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

function readSeen(): Set<string> {
  try {
    const raw = window.sessionStorage.getItem(QUIZ_SEEN_STORAGE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try {
    window.sessionStorage.setItem(QUIZ_SEEN_STORAGE_KEY, JSON.stringify([...seen]));
  } catch {
    // Navigazione privata o memoria piena: si gioca lo stesso.
  }
}

function newGame(bank: QuizQuestion[], code: string, challengerScore: number | null): Game {
  const questions = pickRound(bank, challengeSeed(code));
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
 * Quiz del Baskin (UX-61). Le domande dipendono da `sessionStorage` (quelle già
 * fatte in questa visita), quindi il gioco parte solo nel browser.
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

function QuizGame({ bank, member, initialBest, challenge }: BaskinQuizProps) {
  const t = useTranslations("pages.games.quiz");
  const router = useRouter();
  const [game, setGame] = useState<Game>(() =>
    challenge
      ? newGame(bank, challenge.code, challenge.score)
      : newGame(bank, pickFreshCode(bank, readSeen()), null)
  );
  const [best, setBest] = useState(initialBest);
  // Una partita finita si conta una volta sola, anche tornando indietro.
  const countedRef = useRef<string | null>(null);

  const played = useMutation({
    mutationFn: () => fetch("/api/games/quiz/played", { method: "POST" }),
  });
  const saveBest = useMutation({
    mutationFn: async (score: number) => {
      const res = await fetch("/api/users/me/quiz-best", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
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
    writeSeen(nextSeen(bank, readSeen(), game.questions));
    played.mutate();
    if (member) saveBest.mutate(score);
  }

  function playAgain() {
    const last = new Set(game.questions.map((q) => q.id));
    setGame(newGame(bank, pickFreshCode(bank, readSeen(), last), null));
    // Fuori dal link di sfida: la partita nuova non è più quella di chi ha sfidato.
    if (challenge) router.replace("/giochi/quiz", { scroll: false });
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
        total={game.questions.length}
        pick={game.picks[game.index]}
        confirmed={game.confirmed[game.index]}
        isLast={game.index === game.questions.length - 1}
        onPick={(answer) =>
          setGame((g) =>
            g.confirmed[g.index]
              ? g
              : { ...g, picks: g.picks.map((p, i) => (i === g.index ? answer : p)) }
          )
        }
        onConfirm={() =>
          setGame((g) => ({
            ...g,
            confirmed: g.confirmed.map((c, i) => (i === g.index ? true : c)),
          }))
        }
        onBack={game.index > 0 ? () => setGame((g) => ({ ...g, index: g.index - 1 })) : null}
        onNext={() =>
          game.index === game.questions.length - 1
            ? finish()
            : setGame((g) => ({ ...g, index: g.index + 1 }))
        }
      />
    </Box>
  );
}
