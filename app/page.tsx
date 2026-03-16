"use client";

import { useState, useCallback, useRef } from "react";
import PromptPanel from "./components/PromptPanel";
import ResultGrid from "./components/ResultGrid";
import { MODELS, IMAGES_PER_MODEL, ImageResult } from "./types";

// Initialize empty result slots for all models × images
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

// Concurrency-limited batch executor
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

      // Reset all results
      setResults(createEmptyResults());

      // Build the actual prompt for dev display
      const displayPrompt = characterBase64
        ? `[캐릭터 이미지 첨부]\n\n${prompt}`
        : prompt;
      setDevPrompt(displayPrompt);

      // Create all generation tasks
      const tasks: (() => Promise<void>)[] = [];
      let completedCount = 0;

      for (const model of MODELS) {
        for (let i = 0; i < IMAGES_PER_MODEL; i++) {
          tasks.push(async () => {
            if (abortRef.current) return;

            // Mark as generating
            updateResult(model.id, i, { status: "generating" });

            try {
              const res = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: model.id,
                  prompt,
                  characterImage: characterBase64,
                }),
              });

              const data = await res.json();

              if (!res.ok || data.error) {
                updateResult(model.id, i, {
                  status: "error",
                  error: data.error || `HTTP ${res.status}`,
                  finishReason: data.finishReason,
                  safetyRatings: data.safetyRatings,
                  elapsed: data.elapsed,
                });
              } else {
                updateResult(model.id, i, {
                  status: "done",
                  imageData: data.imageData,
                  mimeType: data.mimeType,
                  text: data.text,
                  elapsed: data.elapsed,
                  finishReason: data.finishReason,
                  safetyRatings: data.safetyRatings,
                });
              }
            } catch (err: any) {
              updateResult(model.id, i, {
                status: "error",
                error: err.message || "네트워크 오류",
              });
            }

            completedCount++;
            setProgress({ done: completedCount, total });

            // Small delay between requests to be respectful of rate limits
            await new Promise((r) => setTimeout(r, 300));
          });
        }
      }

      // Run with concurrency of 3 (one per model roughly)
      await runWithConcurrency(tasks, 3);
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
        const modelName = MODELS.find((m) => m.id === r.model)?.name || r.model;
        link.download = `${modelName}_${r.index + 1}.png`;
        link.click();
      }, i * 200); // stagger downloads
    });
  };

  return (
    <div className="h-screen flex">
      {/* Left Panel - 20% */}
      <div className="w-[280px] min-w-[260px] flex-shrink-0">
        <PromptPanel
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          devPrompt={devPrompt}
          progress={progress}
        />
      </div>

      {/* Right Panel - 80% */}
      <div className="flex-1 min-w-0">
        <ResultGrid results={results} onDownloadAll={handleDownloadAll} />
      </div>
    </div>
  );
}
