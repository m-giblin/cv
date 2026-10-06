"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { PageBody, PageHeader } from "@/components/ui/page-header";
import { searchHelp } from "@/lib/help/search";
import { HELP_AUDIENCE_LABELS, type HelpArticle, type HelpAudience } from "@/lib/help/types";
import { cn } from "@/lib/utils";

/** Searchable, step-by-step help. Articles open in a workbench; ?article=<id> links straight to one. */
export function HelpCenter({ articles, audiences }: { articles: HelpArticle[]; audiences: HelpAudience[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<string>("all");
  const [audience, setAudience] = useState<HelpAudience | "all">("all");

  const categories = useMemo(() => [...new Set(articles.map((article) => article.category))], [articles]);
  const scoped = useMemo(
    () =>
      articles.filter(
        (article) =>
          (category === "all" || article.category === category) &&
          (audience === "all" || article.audience.includes(audience)),
      ),
    [articles, audience, category],
  );
  const results = useMemo(() => searchHelp(scoped, query), [query, scoped]);
  const categoryCounts = useMemo(
    () =>
      categories.map((name) => ({
        name,
        label: name,
        count: articles.filter(
          (article) => article.category === name && (audience === "all" || article.audience.includes(audience)),
        ).length,
      })),
    [articles, audience, categories],
  );

  const openId = searchParams.get("article");
  const open = articles.find((article) => article.id === openId) ?? null;
  const setOpen = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("article", id);
    else params.delete("article");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const grouped = useMemo(() => {
    if (query.trim()) return [{ category: "Results", items: results }];
    return categories
      .map((name) => ({ category: name, items: results.filter((article) => article.category === name) }))
      .filter((group) => group.items.length > 0);
  }, [categories, query, results]);

  return (
    <>
      <PageHeader
        accent="Step by step."
        eyebrow="Help"
        subtitle="How every part of SE Enablement works, written for your role. Search, or browse by topic."
        title="Help Center."
      />
      <PageBody className="flex flex-col gap-6">
        <label className="relative block max-w-[720px]">
          <span className="sr-only">Search help</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            className="w-full rounded-[14px] border border-line-strong bg-white py-3.5 pr-4 pl-12 text-[16px] font-medium text-ink placeholder:text-[#8A8F9C] focus:border-blue focus:shadow-[0_0_0_3px_var(--color-blue-soft)] focus:outline-none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search, e.g. “submit evidence”, “enroll people”, “bulk approve”"
            type="search"
            value={query}
          />
        </label>

        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Help topics" className="lg:sticky lg:top-6 lg:self-start">
            <ul className="flex flex-col border-l border-line">
              {[{ name: "all", label: "All topics", count: articles.length }, ...categoryCounts].map((item) => (
                <li key={item.name}>
                  <button
                    aria-current={category === item.name ? "true" : undefined}
                    className={cn(
                      "-ml-px flex w-full items-center justify-between gap-3 border-l-2 py-2 pr-2 pl-4 text-left text-[14px]",
                      category === item.name
                        ? "border-blue font-bold text-ink"
                        : "border-transparent text-ink-2 hover:border-line-strong hover:text-ink",
                    )}
                    onClick={() => setCategory(item.name)}
                    type="button"
                  >
                    {item.label}
                    <span className="num text-[12px] text-muted">{item.count}</span>
                  </button>
                </li>
              ))}
            </ul>
            {audiences.length > 1 ? (
              <label className="mt-6 flex flex-col gap-1.5 pl-4 text-[13px] text-ink-2">
                Written for
                <select
                  className="rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[14px] text-ink"
                  onChange={(event) => setAudience(event.target.value as HelpAudience | "all")}
                  value={audience}
                >
                  <option value="all">Every role</option>
                  {audiences.map((item) => (
                    <option key={item} value={item}>
                      {HELP_AUDIENCE_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </nav>

          <div className="flex min-w-0 flex-col gap-8">
            <p aria-live="polite" className="text-sm text-muted">
              {results.length} {results.length === 1 ? "article" : "articles"}
              {query.trim() ? ` for “${query.trim()}”` : ""}
            </p>

            {results.length === 0 ? (
              <div className="rounded-[14px] border border-line bg-white px-6 py-8">
                <p className="text-[15px] font-bold text-ink">Nothing matches that yet.</p>
                <p className="mt-1 text-sm text-ink-2">Try fewer words, or ask the Bosun in the corner of the screen.</p>
              </div>
            ) : (
              grouped.map((group) => (
                <section className="flex flex-col gap-3" key={group.category}>
                  <h2 className="text-[18px] font-extrabold text-ink">{group.category}</h2>
                  <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line-strong bg-white shadow-[var(--shadow-card)]">
                    {group.items.map((article) => (
                      <li key={article.id}>
                        <button
                          className="group flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-blue-soft/40 focus-visible:bg-blue-soft/40 focus-visible:outline-none"
                          onClick={() => setOpen(article.id)}
                          type="button"
                        >
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-[16px] font-bold text-ink group-hover:text-blue">{article.title}</span>
                            <span className="text-[14px] leading-snug text-ink-2">{article.summary}</span>
                          </span>
                          <span className="num hidden shrink-0 text-[13px] text-muted sm:inline">
                            {article.steps.length} steps
                          </span>
                          <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted group-hover:text-blue" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      </PageBody>

      {open ? <ArticleWorkbench article={open} articles={articles} onClose={() => setOpen(null)} onOpen={setOpen} /> : null}
    </>
  );
}

function ArticleWorkbench({
  article,
  articles,
  onClose,
  onOpen,
}: {
  article: HelpArticle;
  articles: HelpArticle[];
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  // Related articles the reader can't access are simply not listed.
  const related = (article.related ?? [])
    .map((id) => articles.find((item) => item.id === id))
    .filter((item): item is HelpArticle => Boolean(item));

  return (
    <Drawer eyebrow={article.category} key={article.id} onClose={onClose} open subtitle={article.summary} title={article.title}>
      <article className="flex flex-col gap-6 text-[15px] leading-relaxed text-ink-2">
        {article.overview?.length ? (
          <section className="flex flex-col gap-3 rounded-[14px] bg-blue-soft px-5 py-4">
            <h3 className="label-caps label-caps--blue">How it works</h3>
            {article.overview.map((paragraph) => (
              <p className="m-0 text-ink" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </section>
        ) : null}

        <ol className="flex flex-col gap-3">
          {article.steps.map((step, index) => (
            <li className="flex gap-4 rounded-[14px] border border-line bg-white p-4" key={`${index}-${step.title}`}>
              <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue text-sm font-extrabold text-white">
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[16px] font-bold text-ink">{step.title}</span>
                <span>{step.body}</span>
                {step.tip ? (
                  <span className="mt-1 rounded-[8px] bg-[#FFF6E0] px-3 py-2 text-sm text-ink">
                    <b>Tip:</b> {step.tip}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>

        {article.links?.length ? (
          <section className="flex flex-wrap items-center gap-3">
            <span className="label-caps">Take me there</span>
            {article.links.map((link) => (
              <Link className="btn-secondary no-underline" href={link.href} key={link.href} onClick={onClose}>
                {link.label}
              </Link>
            ))}
          </section>
        ) : null}

        {related.length ? (
          <section className="flex flex-col gap-2 border-t border-line pt-5">
            <h3 className="label-caps">Related</h3>
            <ul className="flex flex-col gap-1.5">
              {related.map((item) => (
                <li key={item.id}>
                  <button className={cn("link text-left text-[15px]")} onClick={() => onOpen(item.id)} type="button">
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </article>
    </Drawer>
  );
}
