"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export function PitchPlaybackViewer({ submissionId }: { submissionId: string }) {
 const [signedUrl, setSignedUrl] = useState<string | null>(null);
 const [title, setTitle] = useState("");
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 void (async () => {
 const response = await fetch(`/api/pitch/submissions/${submissionId}/playback`);
 if (!response.ok) {
 setLoading(false);
 return;
 }
 const body = (await response.json()) as { signedUrl: string; title: string };
 setSignedUrl(body.signedUrl);
 setTitle(body.title);
 setLoading(false);
 })();
 }, [submissionId]);

 if (loading) {
 return (
 <div className="flex min-h-24 items-center justify-center text-sp-navy-muted">
 <Loader2 className="h-5 w-5 animate-spin" />
 </div>
 );
 }

 if (!signedUrl) {
 return <p className="text-sm text-sp-navy-muted">Could not load this pitch.</p>;
 }

 return (
 <div className="border border-[#E2DFD9] bg-white">
 <div className="border-b border-[#ECEAE6] p-6">
 <h2 className="text-base font-semibold text-[#0D0E12]">{title}</h2>
 <p className="mt-1 text-sm text-[#6B6860]">Peer pitch reference — study structure and delivery.</p>
 </div>
 <div className="flex justify-center px-6 pb-6 pt-4">
 <video
 className="aspect-video w-full max-w-[440px] border border-[#E2DFD9] object-cover"
 controls
 preload="metadata"
 src={signedUrl}
 >
 <track kind="captions" />
 </video>
 </div>
 </div>
 );
}
