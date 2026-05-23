import ContentCard from "@/components/ui/ContentCard";
import PageHeader from "@/components/ui/PageHeader";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Reports" />

      <ContentCard>
        <p className="text-sm text-slate-500">
          Reports page is prototype UI right now. Use placeholder content until live financial and order data are connected.
        </p>
      </ContentCard>
    </div>
  );
}