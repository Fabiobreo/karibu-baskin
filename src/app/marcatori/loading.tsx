import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";
import MatchesSectionNav from "@/components/matches/MatchesSectionNav";

export default function MarcatoriLoading() {
  return (
    <PageLoadingSkeleton variant="table" items={10} nav={<MatchesSectionNav current="scorers" />} />
  );
}
