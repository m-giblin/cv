import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6" id="main-content">
      <p className="label-mono">Error 404</p>
      <h1 className="text-[32px] leading-[1.05] font-extrabold tracking-[-0.02em] text-ink">
        We can&apos;t find that page.
      </h1>
      <p className="text-[15px] leading-normal text-ink-2">
        The link may be out of date, or you may not have access to it.
      </p>
      <Link className="btn-primary w-fit no-underline" href="/">
        Back to home
      </Link>
    </main>
  );
}
