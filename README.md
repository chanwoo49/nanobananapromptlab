# 🍌 Nano Banana Prompt Lab

나노바나나(Gemini) 이미지 생성 모델의 프롬프트 연구를 위한 배치 생성 도구.

하나의 프롬프트로 **3개 모델 × 5장 = 15장**을 동시에 생성하고, 모델별 결과를 나란히 비교할 수 있습니다.

## 주요 기능

- **배치 생성**: 프롬프트 1건으로 3개 나노바나나 모델(Nano Banana 2, Pro, Original) × 5장씩 생성
- **캐릭터 주입**: 사전 준비된 캐릭터 PNG를 선택하여 프롬프트에 자동 첨부
- **모델별 비교**: 동일 프롬프트의 모델별 결과를 한 화면에서 비교
- **안전 필터링**: `BLOCK_LOW_AND_ABOVE` 기본 적용, Layer 2 하드블록 자동 처리
- **개발자 도구**: 실제 API에 전달된 프롬프트 텍스트 확인 가능
- **상세 정보**: 생성 시간, 안전 등급, 완료 사유 등 메타데이터 표시

## 지원 모델

| 모델 | 모델 ID | 특성 |
|------|---------|------|
| Nano Banana 2 | `gemini-3.1-flash-image-preview` | 고효율, 빠른 생성 |
| Nano Banana Pro | `gemini-3-pro-image-preview` | 고품질, 고급 추론 |
| Nano Banana | `gemini-2.5-flash-image` | 기존 모델 |

## 빠른 시작

### 1. 프로젝트 클론 & 의존성 설치

```bash
git clone <repo-url>
cd nano-banana-prompt-lab
npm install
```

### 2. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 Gemini API Key를 입력합니다:

```
GEMINI_API_KEY=AIza...your_key_here
```

> API Key는 [Google AI Studio](https://aistudio.google.com/)에서 발급 받으세요.
> 이미지 생성 API는 **유료 결제(Billing)가 설정된 계정**이 필요합니다.

### 3. 캐릭터 이미지 준비 (선택사항)

`public/characters/` 폴더에 투명 배경 PNG 파일을 넣어주세요:

```
public/characters/
  ├── char-a.png
  ├── char-b.png
  └── char-c.png
```

> `app/types.ts`의 `DEFAULT_CHARACTERS` 배열에서 파일명과 이름을 수정할 수 있습니다.
> 웹에서 직접 업로드도 가능합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인합니다.

## Vercel 배포

### 방법 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### 방법 2: GitHub 연동

1. GitHub에 코드를 Push
2. [Vercel 대시보드](https://vercel.com)에서 Import
3. Environment Variables에 `GEMINI_API_KEY` 추가
4. Deploy

### 주의사항

- **Hobby 플랜**: Serverless Function 타임아웃 60초 (대부분의 이미지 생성 요청에 충분)
- **Pro 플랜**: 타임아웃 300초까지 확장 가능 (Pro 모델은 생성 시간이 길 수 있음)
- API Route가 1건씩 개별 호출하므로 타임아웃 문제 없음

## 아키텍처

```
┌─────────────────────────────────────────────┐
│                 Client (React)               │
│  ┌──────────┐    ┌────────────────────────┐  │
│  │ Prompt   │    │ Result Grid            │  │
│  │ Panel    │    │ ┌─ NB2: □□□□□ ────────┐│  │
│  │ (20%)    │───▶│ ├─ NBPro: □□□□□ ──────┤│  │
│  │          │    │ └─ NB: □□□□□ ─────────┘│  │
│  └──────────┘    └────────────────────────┘  │
│       │                    ▲                  │
│       │    15 parallel     │                  │
│       ▼    API calls       │                  │
│  ┌─────────────────────────┘                  │
└──│────────────────────────────────────────────┘
   │
   ▼
┌──────────────────────┐     ┌──────────────────┐
│ /api/generate        │────▶│ Gemini API       │
│ (Vercel Serverless)  │     │ (Google)         │
│ - 1건씩 개별 처리     │◀────│ - Image Gen      │
│ - safetySettings     │     │ - Safety Filter  │
│ - 타임아웃 60s 이내   │     └──────────────────┘
└──────────────────────┘
```

## Rate Limit 참고

| 등급 | 대략적 RPM | 15장 소요시간 |
|------|-----------|--------------|
| Free tier | ~10-15 RPM | 3-7분 |
| Pay-as-you-go | ~30-60 RPM | 1-3분 |

> 동시 실행 수(concurrency)는 `app/page.tsx`에서 조정 가능합니다 (기본값: 3).

## 안전 필터링 구조

### Layer 1 (API 설정 가능)
`safetySettings`로 5개 카테고리별 차단 임계값 조정:
- `HARM_CATEGORY_HATE_SPEECH`
- `HARM_CATEGORY_SEXUALLY_EXPLICIT`
- `HARM_CATEGORY_DANGEROUS_CONTENT`
- `HARM_CATEGORY_HARASSMENT`
- `HARM_CATEGORY_CIVIC_INTEGRITY`

기본값: `BLOCK_LOW_AND_ABOVE` (가장 엄격)

### Layer 2 (항상 활성, 변경 불가)
- `IMAGE_SAFETY` — 노출, 성적 이미지 등
- `PROHIBITED_CONTENT` — 아동 관련, 극단적 폭력 등
- `CSAM` / `SPII` 보호

→ 이 도구에서는 `finishReason`을 파싱하여 에러 원인을 표시합니다.

## 커스터마이즈

### 모델 추가/변경
`app/types.ts`의 `MODELS` 배열을 수정하세요.

### 동시 실행 수 변경
`app/page.tsx`의 `runWithConcurrency(tasks, 3)` 에서 숫자를 조절하세요.

### Safety 설정 변경
`app/api/generate/route.ts`의 `safetySettings` 배열에서 threshold를 변경하세요.

## 라이선스

MIT
