import { OrderDetailsPage } from "@/components/order-details-page";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetailsPage orderId={Number(id)} />;
}
