import { notFound } from "next/navigation";
import { getTicket } from "@/app/q/[slug]/actions";
import { TicketView } from "@/components/customer/ticket-view";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Your place in line",
  robots: { index: false, follow: false },
};

export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { token } = await params;
  const { welcome } = await searchParams;

  const ticket = await getTicket(token);
  if (!ticket) notFound();

  return <TicketView token={token} initial={ticket} welcome={welcome === "1"} />;
}
