import ContentCard from "@/components/ui/ContentCard";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";

export default function CustomerPage() {
  return (
    <div>
      <PageHeader title="Customers" />

      <ContentCard>
        <EmptyState
          title="No customers yet"
          description="Create your first customer record to begin managing orders and repeat business."
        />
      </ContentCard>
    </div>
  );
}