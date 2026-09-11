import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function ArchivioSquadreLoading() {
  return <PageLoadingSkeleton variant="grid" items={6} heroPy={{ xs: 5, md: 7 }} />;
}
