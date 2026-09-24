/** Consistent title block for portal pages. */
export function PageHeader({
  title,
  lede,
  action,
}: {
  title: string;
  lede?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div>
        <h1 className="display-lg text-3xl sm:text-4xl">{title}</h1>
        {lede && <p className="text-muted-foreground mt-2 max-w-xl">{lede}</p>}
      </div>
      {action}
    </div>
  );
}
