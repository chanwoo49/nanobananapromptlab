import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ──────────────────────────────────────────────
// 허용 IP 목록 (prefix 매칭)
// "115.92.149." → 115.92.149.0 ~ 115.92.149.255 전체 허용
// 특정 IP 1개만 허용하려면 전체 주소 입력: "1.2.3.4"
// ──────────────────────────────────────────────
const ALLOWED_IPS = [
  "115.92.149.", // 사내 대역
  "127.0.0.1",   // 로컬 개발
  "::1",         // 로컬 개발 (IPv6)
];

export function middleware(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "";

  const isAllowed = ALLOWED_IPS.some((allowed) => ip.startsWith(allowed));

  if (!isAllowed) {
    return new NextResponse(
      JSON.stringify({
        message: "접근이 제한되었습니다.",
        detail: "허용된 네트워크에서만 접속할 수 있습니다.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return NextResponse.next();
}

// 정적 파일 제외, 나머지 모든 경로에 적용
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
