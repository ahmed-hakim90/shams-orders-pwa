import { InvoicePrintPage } from "@/components/invoice-print-page";

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InvoicePrintPage orderId={Number(id)} />;
}
