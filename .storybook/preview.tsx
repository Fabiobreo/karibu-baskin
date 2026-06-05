import type { Preview, Decorator } from "@storybook/nextjs-vite";
import React from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { fn } from "storybook/test";
import { lightTheme, darkTheme } from "../src/theme";
import { ToastContext } from "../src/context/ToastContext";
import messages from "../src/i18n/messages/it.json";

const toastValue = { showToast: fn() };

const withProviders: Decorator = (Story, context) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const isDark = context.globals?.backgrounds?.value === "#1A1A1A";
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <NextIntlClientProvider locale="it" messages={messages}>
      <QueryClientProvider client={qc}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ToastContext.Provider value={toastValue}>
            <Story />
          </ToastContext.Provider>
        </ThemeProvider>
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
};

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
    backgrounds: {
      default: "light",
      values: [
        { name: "light", value: "#F7F4F1" },
        { name: "dark", value: "#1A1A1A" },
        { name: "white", value: "#FFFFFF" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
    viewport: {
      viewports: {
        mobile: { name: "Mobile", styles: { width: "390px", height: "844px" } },
        tablet: { name: "Tablet", styles: { width: "768px", height: "1024px" } },
        desktop: { name: "Desktop", styles: { width: "1280px", height: "900px" } },
      },
      defaultViewport: "desktop",
    },
  },
};

export default preview;
