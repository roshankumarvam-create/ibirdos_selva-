import ContentCard from "@/components/ui/ContentCard";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

export default function VendorsPage() {
  return (
    <div>
      <PageHeader title="Vendors" />

      <ContentCard>
        <EmptyState
          title="No vendors yet"
          description="Add vendor records to start tracking supplier relationships and invoice history."
        />
      </ContentCard>
    </div>
  );
}