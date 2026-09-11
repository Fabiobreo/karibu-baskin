import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function RisultatiLoading() {
  return (
    <PageLoadingSkeleton variant="list" items={6} heroAlign="left" heroPy={{ xs: 5, md: 7 }} />
  );
}
