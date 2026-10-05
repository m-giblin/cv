export default function Loading() {
  return (
    <div aria-busy="true" className="flex min-h-[40vh] items-center justify-center" role="status">
      <span className="label-mono">Loading team overview…</span>
    </div>
  );
}
