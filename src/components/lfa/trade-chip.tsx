/** Colour-coded trade label. Colour is set per trade in globals.css. */
export function TradeChip({
  trade,
  className = "",
}: {
  trade: string;
  className?: string;
}) {
  const label = trade.charAt(0) + trade.slice(1).toLowerCase();
  return (
    <span data-trade={trade} className={`trade-chip ${className}`}>
      {label}
    </span>
  );
}

export const STATE_NAMES: Record<string, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "ACT",
  NT: "Northern Territory",
};
