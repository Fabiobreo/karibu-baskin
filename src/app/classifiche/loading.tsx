import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";
import MatchesSectionNav from "@/components/matches/MatchesSectionNav";

export default function ClassificheLoading() {
  return (
    <PageLoadingSkeleton
      variant="table"
      items={8}
      nav={<MatchesSectionNav current="standings" />}
    />
  );
}
