import type { Metadata } from "next";
import ErrorPage from "@/components/ErrorPage";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = { title: "Pagina non trovata | Karibu Baskin" };

export default async function NotFound() {
  const t = await getTranslations("errors");
  return <ErrorPage code="404" title={t("notFound")} description={t("notFoundDesc")} />;
}
