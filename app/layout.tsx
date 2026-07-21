import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { SidebarProvider } from "@/context/SidebarContext";
import Navbar from "@/components/Navbar";
import { MainContent } from "@/components/MainContent";
import ChatbotWidget from "@/components/ChatbotWidget";

export const metadata: Metadata = {
  title: "Task Management App",
  description: "Task management frontend",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <UserProvider>
            <SidebarProvider>
              <Navbar />
              <MainContent>{children}</MainContent>
              <ChatbotWidget />
            </SidebarProvider>
          </UserProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
