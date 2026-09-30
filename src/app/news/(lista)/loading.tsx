import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function NewsLoading() {
  return <PageLoadingSkeleton column="reading" variant="list" items={5} />;
}
