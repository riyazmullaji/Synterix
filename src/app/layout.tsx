import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "Synterix",
  description: "Document processing engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main
          className="min-h-screen"
          style={{ marginLeft: "var(--sidebar-width)" }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
