import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
        Prototype
      </p>
      <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight">
        Labour Workforce Australia
      </h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-lg">
        Verified tradespeople. Admin-reviewed documents. Escrow-protected
        payments. A working demo of the core hiring flow for Australian
        trades.
      </p>
      <div className="mt-8 flex gap-3">
        <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
          Get started
        </Button>
        <Button
          size="lg"
          variant="outline"
          nativeButton={false}
          render={<Link href="/login" />}
        >
          Log in
        </Button>
      </div>
    </div>
  );
}
