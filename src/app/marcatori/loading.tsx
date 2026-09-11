import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function MarcatoriLoading() {
  return (
    <PageLoadingSkeleton
      variant="table"
      items={10}
      maxWidth="lg"
      heroAlign="left"
      heroPy={{ xs: 5, md: 7 }}
    />
  );
}
