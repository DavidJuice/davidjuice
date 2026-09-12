import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Verified Insurance Intelligence",
  description: "Source-grounded carrier product search for insurance professionals",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <b>Verified Insurance Intelligence</b>
          <a href="/">Dashboard</a>
          <a href="/documents/upload">Upload</a>
          <a href="/review">Review Queue</a>
          <a href="/search">Search Plans</a>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
