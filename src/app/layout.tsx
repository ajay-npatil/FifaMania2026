import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "FifaMania",
  description: "Predict World Cup scores with friends and climb the leaderboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 w-full">{children}</main>
        <footer className="w-full text-center text-xs text-zinc-500 py-4">
          Created by Dhruv Patil
          {process.env.VERCEL_GIT_COMMIT_REF === "dev" && " | Env : Dev"}
        </footer>
      </body>
    </html>
  );
}
