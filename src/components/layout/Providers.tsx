"use client";
import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/context/NotificationContext";
import { ThemeContextProvider, useThemeMode } from "@/context/ThemeContext";
import { LocaleContextProvider } from "@/context/LocaleContext";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { Session } from "next-auth";

// Componente separato per accedere al context DOPO che ThemeContextProvider è montato
function ThemedContent({ children }: { children: React.ReactNode }) {
  const { activeTheme } = useThemeMode();
  return (
    <ThemeProvider theme={activeTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default function Providers({
  children,
  session,
  colorMode = "system",
}: {
  children: React.ReactNode;
  session: Session | null;
  colorMode?: "light" | "dark" | "system";
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session}>
        <LocaleContextProvider>
          <ThemeContextProvider initialMode={colorMode}>
            <ThemedContent>
              <NotificationProvider>{children}</NotificationProvider>
            </ThemedContent>
          </ThemeContextProvider>
        </LocaleContextProvider>
      </SessionProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
