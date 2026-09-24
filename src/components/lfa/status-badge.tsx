/** Job, document, credential and profile statuses with meaningful colour. */
const TONES: Record<string, string> = {
  HIRED: "bg-[#d8efe1] text-[#145c39]",
  IN_PROGRESS: "bg-[#dce7fb] text-[#12459d]",
  COMPLETED: "bg-[#d8efe1] text-[#145c39]",
  APPROVED: "bg-[#d8efe1] text-[#145c39]",
  LIVE: "bg-[#d8efe1] text-[#145c39]",
  PENDING: "bg-[#fbecc2] text-[#7a5200]",
  PENDING_REVIEW: "bg-[#fbecc2] text-[#7a5200]",
  DRAFT: "bg-muted text-muted-foreground",
  HIDDEN: "bg-muted text-muted-foreground",
  REJECTED: "bg-[#fbd9d4] text-[#8a1f12]",
  EXPIRED: "bg-[#fbd9d4] text-[#8a1f12]",
  DISPUTED: "bg-[#fbd9d4] text-[#8a1f12]",
  CANCELLED: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded px-2 text-xs font-semibold ${TONES[status] ?? "bg-muted text-muted-foreground"} ${className}`}
    >
      {label}
    </span>
  );
}
