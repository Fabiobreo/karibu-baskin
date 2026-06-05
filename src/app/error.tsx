"use client";
import { useEffect } from "react";
import ErrorPage from "@/components/ErrorPage";
import { useTranslations } from "next-intl";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("[error boundary]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <ErrorPage
      code="500"
      title={t("serverError")}
      description={t("serverErrorDesc")}
      showReset
      onReset={reset}
      digest={error.digest}
    />
  );
}
