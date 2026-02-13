import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beth Health OS v2",
  description: "Unified medical record workspace for clinician-ready context."
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body className="font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
