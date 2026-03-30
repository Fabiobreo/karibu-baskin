"use client";
import { createContext, useContext } from "react";
import type { AppRole } from "@prisma/client";

interface PreviewRoleContextValue {
  previewRole: AppRole | null;
}

const PreviewRoleContext = createContext<PreviewRoleContextValue>({ previewRole: null });

export function PreviewRoleProvider({
  children,
  previewRole,
}: {
  children: React.ReactNode;
  previewRole: AppRole | null;
}) {
  return (
    <PreviewRoleContext.Provider value={{ previewRole }}>
      {children}
    </PreviewRoleContext.Provider>
  );
}

export function usePreviewRole() {
  return useContext(PreviewRoleContext);
}
