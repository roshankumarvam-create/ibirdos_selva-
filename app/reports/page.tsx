import ContentCard from "@/components/ui/ContentCard";
import PageHeader from "@/components/ui/PageHeader";

type DashboardMetric = {
  title: string;
  value: string;
  note: string;
};

const metrics: DashboardMetric[] = [
  {
    title: "Invoices Processed",
    value: "0",
    note: "Prototype value",
  },
  {
    title: "Orders",
    value: "0",
    note: "Prototype value",
  },
  {
    title: "Vendors",
    value: "0",
    note: "Prototype value",
  },
  {
    title: "Margin Visibility",
    value: "$0.00",
    note: "Prototype value",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.title}
            className="rounded-2xl border border-[#d7c7ab] bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-bold text-[#111827]">{metric.title}</p>
            <p className="mt-3 text-3xl font-black text-[#062414]">
              {metric.value}
            </p>
            <p className="mt-2 text-sm text-slate-500">{metric.note}</p>
          </div>
        ))}
      </div>

      <ContentCard>
        <h3 className="text-lg font-semibold">System Overview</h3>
        <p className="mt-2 text-sm text-slate-500">
          This dashboard is the core shell for iBirdOS. Connect real backend data next after route cleanup and stable Azure review deployment.
        </p>
      </ContentCard>
    </div>
  );
}