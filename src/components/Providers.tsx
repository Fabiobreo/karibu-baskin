"use client";
import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/context/NotificationContext";
import type { Session } from "next-auth";

export default function Providers({ children, session }: { children: React.ReactNode; session: Session | null }) {
  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SessionProvider>
  );
}
