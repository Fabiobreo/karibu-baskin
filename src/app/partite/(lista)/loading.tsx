import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";
import MatchesSectionNav from "@/components/matches/MatchesSectionNav";

export default function PartiteLoading() {
  return (
    <PageLoadingSkeleton
      column="main"
      heroColumn="full"
      variant="list"
      items={5}
      nav={<MatchesSectionNav current="upcoming" />}
    />
  );
}
