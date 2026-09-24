"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-white/80 hover:bg-white/10 hover:text-white"
      onClick={() => signOut({ redirectTo: "/login" })}
    >
      Log out
    </Button>
  );
}
