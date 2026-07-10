"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

type SearchResult = {
 type: "tenant" | "ticket" | "profile";
 id: string;
 label: string;
 sublabel?: string;
};

export function PlatformGlobalSearch({
 onSelectTenant,
 onSelectTicket,
}: {
 onSelectTenant: (tenantId: string) => void;
 onSelectTicket: (ticketId: string) => void;
}) {
 const [query, setQuery] = useState("");
 const [results, setResults] = useState<SearchResult[]>([]);
 const [loading, setLoading] = useState(false);

 useEffect(() => {
 if (query.trim().length < 2) {
 setResults([]);
 return;
 }

 const handle = setTimeout(() => {
 setLoading(true);
 void fetch(`/api/platform/search?q=${encodeURIComponent(query.trim())}`)
 .then((res) => res.json())
 .then((body: { results: SearchResult[] }) => setResults(body.results ?? []))
 .finally(() => setLoading(false));
 }, 250);

 return () => clearTimeout(handle);
 }, [query]);

 return (
 <div className="relative">
 <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#A09D98]" />
 <input
 className="w-full border border-[#E2DFD9] bg-white py-2 pl-9 pr-3 text-sm "
 onChange={(e) => setQuery(e.target.value)}
 placeholder="Search tenants, tickets, users…"
 value={query}
 />
 {query.length >= 2 ? (
 <div className="absolute z-20 mt-1 w-full border border-[#E2DFD9] bg-white ">
 {loading ? (
 <p className="px-3 py-2 text-xs text-[#A09D98]">Searching…</p>
 ) : results.length === 0 ? (
 <p className="px-3 py-2 text-xs text-[#A09D98]">No results.</p>
 ) : (
 results.map((result) => (
 <button
 className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[#F9F8F6]"
 key={`${result.type}-${result.id}`}
 onClick={() => {
 if (result.type === "tenant") onSelectTenant(result.id);
 if (result.type === "ticket") onSelectTicket(result.id);
 setQuery("");
 setResults([]);
 }}
 type="button"
 >
 <span className="font-medium text-[#0D0E12]">{result.label}</span>
 <span className="text-xs text-[#A09D98]">
 {result.type}
 {result.sublabel ? ` · ${result.sublabel}` : ""}
 </span>
 </button>
 ))
 )}
 </div>
 ) : null}
 </div>
 );
}
