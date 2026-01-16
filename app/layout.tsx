import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "붕오떡",
  description: "붕 오 떡\n어   볶\n빵 뎅 이",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Black Han Sans', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
