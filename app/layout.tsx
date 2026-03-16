import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "🍌 Nano Banana Prompt Lab",
  description: "나노바나나 이미지 생성 프롬프트 연구 도구",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen overflow-hidden">{children}</body>
    </html>
  );
}
