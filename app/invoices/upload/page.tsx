"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type UploadedInvoice = {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  status: string;
};

type UploadedLine = {
  id: string;
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  status: string;
};

type UploadSuccessResponse = {
  success: true;
  invoiceId: string;
  redirectUrl?: string;
  invoice?: UploadedInvoice;
  lines?: UploadedLine[];
};

type UploadErrorResponse = {
  success: false;
  error: string;
};

type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InvoiceUploadPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

  const fileName = useMemo(() => {
    return selectedFile ? selectedFile.name : "No invoice selected";
  }, [selectedFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedFile) {
      setResult({
        success: false,
        error: "Please choose an invoice PDF, image, or CSV first.",
      });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.success) {
        setResult({
          success: false,
          error: data.success ? "Invoice upload failed." : data.error,
        });
        return;
      }

      setResult(data);

      const redirectUrl = data.redirectUrl ?? `/invoices/${data.invoiceId}`;

      window.setTimeout(() => {
        router.push(redirectUrl);
      }, 500);
    } catch (error: unknown) {
      setResult({
        success: false,
        error:
          error instanceof Error ? error.message : "Invoice upload failed.",
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#061A10] px-6 py-10 text-[#061A10]">
      <section className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border border-[#D8B767]/50 bg-[#FFF9EC] shadow-2xl lg:grid-cols-[1fr_0.9fr]">
        <div className="bg-gradient-to-br from-[#092214] via-[#0C2D1A] to-[#39411F] p-8 text-white md:p-12">
          <p className="text-xs font-black uppercase tracking-[0.45em] text-[#F2C861]">
            iBirdOS invoice brain
          </p>

          <h1 className="mt-8 max-w-xl text-5xl font-black leading-[0.95] md:text-6xl">
            Upload invoice.
            <br />
            Review lines.
            <br />
            Confirm costs.
          </h1>

          <p className="mt-8 max-w-xl text-base font-medium leading-8 text-white/90">
            Upload supplier invoices, review extracted line items, then confirm
            to update ingredient costs, price history, alerts, and recipe cost.
          </p>

          <div className="mt-20 rounded-3xl border border-white/15 bg-white/10 p-6 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-[#F2C861]">
              Engine flow
            </p>
            <p className="mt-4 text-xl font-black">
              Upload → Review → Edit → Confirm → Alert
            </p>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="mx-auto max-w-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#061A10] text-xl font-black text-[#F2C861]">
              iB
            </div>

            <p className="mt-8 text-xs font-black uppercase tracking-[0.45em] text-[#9A6A12]">
              Secure invoice upload
            </p>

            <h2 className="mt-4 text-4xl font-black">Azure cost engine</h2>

            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-3xl border border-[#D8B767]/70 bg-white p-6 shadow-xl"
            >
              <label className="block">
                <span className="text-sm font-black">Supplier invoice</span>

                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp,text/csv,.csv"
                  onChange={handleFileChange}
                  className="mt-3 w-full rounded-2xl border border-[#D7C7A3] bg-[#FFFCF5] px-4 py-3 text-sm font-bold"
                />
              </label>

              <div className="mt-4 rounded-2xl border border-[#E7D7B0] bg-[#FFF9EC] px-4 py-3 text-sm font-bold text-[#5B6B61]">
                {fileName}
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="mt-5 w-full rounded-2xl bg-[#061A10] px-5 py-3 text-sm font-black text-white transition hover:bg-[#123B24] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUploading ? "Reading invoice..." : "Upload invoice"}
              </button>

              {result ? (
                <div
                  className={`mt-5 rounded-2xl border px-4 py-4 text-sm font-bold ${
                    result.success
                      ? "border-[#BFE8B7] bg-[#EFFFEA] text-[#123B24]"
                      : "border-[#F2B7A2] bg-[#FFF1EA] text-[#9A2F13]"
                  }`}
                >
                  {result.success ? (
                    <div className="space-y-2">
                      <p className="text-lg font-black">
                        Invoice processed successfully
                      </p>
                      <p>Invoice ID: {result.invoiceId}</p>
                      <p>
                        Vendor:{" "}
                        {result.invoice?.vendorName || "Review invoice page"}
                      </p>
                      <p>
                        Invoice #:{" "}
                        {result.invoice?.invoiceNumber || "Review needed"}
                      </p>
                      <p>
                        Total:{" "}
                        {formatCurrency(result.invoice?.totalAmount ?? 0)}
                      </p>
                      <p>Lines: {result.lines?.length ?? 0}</p>
                      <p className="pt-2 text-[#006B3F]">
                        Opening invoice review page...
                      </p>
                    </div>
                  ) : (
                    <p>{result.error}</p>
                  )}
                </div>
              ) : null}
            </form>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/invoices"
                className="block rounded-2xl border border-[#061A10] px-5 py-3 text-center text-sm font-black"
              >
                Back to invoices
              </Link>

              <Link
                href="/dashboard"
                className="block rounded-2xl border border-[#061A10] px-5 py-3 text-center text-sm font-black"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}