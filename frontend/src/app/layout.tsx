import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";

export const metadata: Metadata = {
  title: "Aegis Chat",
  description: "Real-time chat app prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
