import type { Metadata } from "next";
import "./../styles/globals.css";
import { Black_Han_Sans } from "next/font/google";

const blackHanSans = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-black-han-sans",
});

export const metadata: Metadata = {
  title: "붕오떡",
  description: "붕오떡 큐브 돌리기",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={blackHanSans.variable}>{children}</body>
    </html>
  );
}
