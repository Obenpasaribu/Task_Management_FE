"use client";

import { useSidebar } from "@/context/SidebarContext";

export function MainContent({ children }: { children: React.ReactNode }) {
  const { isExpanded } = useSidebar();

  return (
    <main
      className={`transition-all duration-300 ${
        isExpanded ? "ml-64" : "ml-20"
      }`}
    >
      {children}
    </main>
  );
}
