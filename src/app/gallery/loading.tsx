import PageLoadingSkeleton from "@/components/common/PageLoadingSkeleton";

export default function GalleryLoading() {
  return <PageLoadingSkeleton variant="grid" items={9} maxWidth="lg" />;
}
