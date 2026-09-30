import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function PartiteLoading() {
  return <PageLoadingSkeleton column="main" variant="list" items={5} />;
}
