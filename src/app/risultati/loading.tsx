import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";
import MatchesSectionNav from "@/components/matches/MatchesSectionNav";

export default function RisultatiLoading() {
  return (
    <PageLoadingSkeleton
      column="main"
      heroColumn="full"
      variant="list"
      items={6}
      nav={<MatchesSectionNav current="results" />}
    />
  );
}
