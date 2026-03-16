"use client";

import { useState, useCallback, useRef } from "react";
import PromptPanel from "./components/PromptPanel";
import ResultGrid from "./components/ResultGrid";
import { MODELS, IMAGES_PER_MODEL, ImageResult } from "./types";

const MAX_RETRIES = 2; // 실패 시 최대 2회 재시도 (총 3회 시도)
const RETRY_DELAY = 2000; // 재시도 전 대기 시간 (ms)
const CONCURRENCY = 2; // 동시 실행 수 (Rate Limit 여유)

// 재시도 가능한 오류인지 판별
function isRetryable(error: string, httpStatus?: number): boolean {
  if (httpStatus === 504 || httpStatus === 503 || httpStatus === 429) return true;
  if (error.includes("TIMEOUT")) return true;
  if (error.includes("overloaded")) return true;
  if (error.includes("이미지가 포함되지 않았습니다")) return true;
  if (error.includes("네트워크 오류")) return true;
  return false;
}

function createEmptyResults(): ImageResult[] {
  const results: ImageResult[] = [];
  for (const model of MODELS) {
    for (let i = 0; i < IMAGES_PER_MODEL; i++) {
      results.push({
        id: `${model.id}-${i}`,
        model: model.id,
        index: i,
        status: "idle",
      });
    }
  }
  return results;
}

async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const queue = [...tasks];
  let index = 0;

  const runNext = async (): Promise<void> => {
    while (index < queue.length) {
      const currentIndex = index++;
      results[currentIndex] = await queue[currentIndex]();
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) },
    () => runNext()
  );
  await Promise.all(workers);
  return results;
}

// ── 단일 이미지 생성 API 호출 (재시도 포함) ──
async function generateSingle(
  modelId: string,
  prompt: string,
  characterBase64: string | null,
  onStatus: (msg: string) => void
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  httpStatus?: number;
}> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      onStatus(`재시도 ${attempt}/${MAX_RETRIES}...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelId,
          prompt,
          characterImage: characterBase64,
        }),
      });

      const rawText = await res.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        const error = `서버 오류 (HTTP ${res.status}): ${rawText.slice(0, 100)}`;
        if (attempt < MAX_RETRIES && isRetryable(error, res.status)) continue;
        return { success: false, error, httpStatus: res.status };
      }

      // API 에러
      if (!res.ok || data.error) {
        const error = data.error || `HTTP ${res.status}`;
        if (attempt < MAX_RETRIES && isRetryable(error, res.status)) continue;
        return { success: false, data, error, httpStatus: res.status };
      }

      // 이미지 없음 — 재시도 가능
      if (!data.imageData) {
        const error = "응답에 이미지가 포함되지 않았습니다.";
        if (attempt < MAX_RETRIES) continue;
        return { success: false, data, error };
      }

      // 성공
      return { success: true, data };
    } catch (err: any) {
      const error = err.message || "네트워크 오류";
      if (attempt < MAX_RETRIES && isRetryable(error)) continue;
      return { success: false, error };
    }
  }

  return { success: false, error: "최대 재시도 횟수 초과" };
}

export default function Home() {
  const [results, setResults] = useState<ImageResult[]>(createEmptyResults());
  const [isGenerating, setIsGenerating] = useState(false);
  const [devPrompt, setDevPrompt] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const abortRef = useRef(false);

  const updateResult = useCallback(
    (modelId: string, index: number, update: Partial<ImageResult>) => {
      setResults((prev) =>
        prev.map((r) =>
          r.model === modelId && r.index === index ? { ...r, ...update } : r
        )
      );
    },
    []
  );

  const handleGenerate = useCallback(
    async (prompt: string, characterBase64: string | null) => {
      setIsGenerating(true);
      abortRef.current = false;

      const total = MODELS.length * IMAGES_PER_MODEL;
      setProgress({ done: 0, total });
      setResults(createEmptyResults());

      const displayPrompt = characterBase64
        ? `[캐릭터 이미지 첨부]\n\n${prompt}`
        : prompt;
      setDevPrompt(displayPrompt);

      const tasks: (() => Promise<void>)[] = [];
      let completedCount = 0;

      for (const model of MODELS) {
        for (let i = 0; i < IMAGES_PER_MODEL; i++) {
          tasks.push(async () => {
            if (abortRef.current) return;

            updateResult(model.id, i, { status: "generating" });

            const result = await generateSingle(
              model.id,
              prompt,
              characterBase64,
              // 재시도 상태를 UI에 반영
              (msg) =>
                updateResult(model.id, i, {
                  status: "generating",
                  text: msg,
                })
            );

            if (result.success && result.data) {
              updateResult(model.id, i, {
                status: "done",
                imageData: result.data.imageData,
                mimeType: result.data.mimeType,
                text: result.data.text,
                elapsed: result.data.elapsed,
                finishReason: result.data.finishReason,
                safetyRatings: result.data.safetyRatings,
              });
            } else {
              updateResult(model.id, i, {
                status: "error",
                error: result.error,
                finishReason: result.data?.finishReason,
                safetyRatings: result.data?.safetyRatings,
                elapsed: result.data?.elapsed,
              });
            }

            completedCount++;
            setProgress({ done: completedCount, total });

            // Rate Limit 배려: 요청 간 간격
            await new Promise((r) => setTimeout(r, 500));
          });
        }
      }

      await runWithConcurrency(tasks, CONCURRENCY);
      setIsGenerating(false);
    },
    [updateResult]
  );

  const handleDownloadAll = () => {
    const doneResults = results.filter(
      (r) => r.status === "done" && r.imageData
    );
    doneResults.forEach((r, i) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = `data:${r.mimeType};base64,${r.imageData}`;
        const modelName =
          MODELS.find((m) => m.id === r.model)?.name || r.model;
        link.download = `${modelName}_${r.index + 1}.png`;
        link.click();
      }, i * 200);
    });
  };

  return (
    <div className="h-screen flex">
      {/* Left Panel */}
      <div className="w-[280px] min-w-[260px] flex-shrink-0">
        <PromptPanel
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          devPrompt={devPrompt}
          progress={progress}
        />
      </div>

      {/* Right Panel */}
      <div className="flex-1 min-w-0">
        <ResultGrid results={results} onDownloadAll={handleDownloadAll} />
      </div>
    </div>
  );
}