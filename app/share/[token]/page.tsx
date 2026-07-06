import { BuyerShareRoom } from "@/components/buyer-shares/buyer-share-room";

type SharePageProps = {
  params: Promise<{ token: string }>;
};

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  return <BuyerShareRoom token={token} />;
}
