import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function ClassificheLoading() {
  return (
    <PageLoadingSkeleton variant="table" items={8} heroAlign="left" heroPy={{ xs: 5, md: 7 }} />
  );
}
