"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();

  if (isLoaded && !isSignedIn) {
    redirect("/sign-in");
  }

  return <>{children}</>;
}
