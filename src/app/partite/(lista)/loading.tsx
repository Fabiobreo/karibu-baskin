import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function PartiteLoading() {
  return (
    <PageLoadingSkeleton variant="list" items={5} heroAlign="left" heroPy={{ xs: 5, md: 7 }} />
  );
}
