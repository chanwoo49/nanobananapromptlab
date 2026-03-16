"use client";

import { ImageResult, ModelConfig, MODELS, IMAGES_PER_MODEL } from "../types";
import { useState, useEffect } from "react";

interface ResultGridProps {
  results: ImageResult[];
  onDownloadAll: () => void;
}

/* ─── Full-screen detail modal ─── */
function DetailModal({
  result,
  onClose,
}: {
  result: ImageResult;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const modelName =
    MODELS.find((m) => m.id === result.model)?.name || result.model;

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-3xl w-full max-h-[92vh] flex flex-col bg-lab-surface rounded-xl overflow-hidden border border-lab-border shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="flex-1 min-h-0 bg-black flex items-center justify-center p-2">
          <img
            src={`data:${result.mimeType};base64,${result.imageData}`}
            alt="Full size"
            className="max-w-full max-h-[70vh] object-contain rounded"
          />
        </div>

        {/* Info footer */}
        <div className="p-4 border-t border-lab-border space-y-2.5 flex-shrink-0">
          {result.text && (
            <p className="text-[12px] text-lab-muted leading-relaxed line-clamp-3">
              {result.text}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5 flex-wrap">
              <span className="font-mono text-[10px] bg-lab-card text-lab-muted px-2 py-0.5 rounded">
                {modelName}
              </span>
              <span className="font-mono text-[10px] bg-lab-card text-lab-muted px-2 py-0.5 rounded">
                {result.elapsed}s
              </span>
              {result.finishReason && (
                <span className="font-mono text-[10px] bg-lab-card text-lab-muted px-2 py-0.5 rounded">
                  {result.finishReason}
                </span>
              )}
            </div>
            <button
              className="flex-shrink-0 px-3 py-1.5 bg-banana-500/20 border border-banana-500/30 rounded text-[11px] text-banana-400 font-mono hover:bg-banana-500/30 transition-colors"
              onClick={() => {
                const link = document.createElement("a");
                link.href = `data:${result.mimeType};base64,${result.imageData}`;
                link.download = `${modelName}_${result.index + 1}.png`;
                link.click();
              }}
            >
              다운로드
            </button>
          </div>
          {result.safetyRatings && (
            <div className="flex flex-wrap gap-1">
              {result.safetyRatings.map((r: any, i: number) => (
                <span
                  key={i}
                  className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                    r.probability === "NEGLIGIBLE"
                      ? "bg-green-950/30 text-green-500/60"
                      : r.probability === "LOW"
                        ? "bg-yellow-950/30 text-yellow-500/60"
                        : "bg-red-950/30 text-red-500/60"
                  }`}
                >
                  {r.category?.replace("HARM_CATEGORY_", "")}: {r.probability}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Single image slot (compact — height set by CSS class .img-slot) ─── */
function ImageSlot({
  result,
  onOpenDetail,
}: {
  result: ImageResult;
  onOpenDetail: (r: ImageResult) => void;
}) {
  if (result.status === "idle") {
    return (
      <div className="img-slot rounded-md bg-lab-bg border border-lab-border/40 flex items-center justify-center">
        <span className="text-lab-muted/15 text-lg font-mono">
          {result.index + 1}
        </span>
      </div>
    );
  }

  if (result.status === "generating") {
    const isRetrying = result.text?.includes("재시도");
    return (
      <div className="img-slot rounded-md overflow-hidden relative">
        <div className="skeleton w-full h-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`w-5 h-5 border-2 rounded-full animate-spin mb-1 ${
              isRetrying
                ? "border-amber-500/30 border-t-amber-500"
                : "border-banana-500/30 border-t-banana-500"
            }`}
          />
          <span className="font-mono text-[9px] text-lab-muted">
            {isRetrying ? result.text : "생성 중"}
          </span>
        </div>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="img-slot rounded-md bg-red-950/15 border border-red-900/20 flex flex-col items-center justify-center p-2 text-center">
        <span className="text-red-400 text-sm mb-0.5">⚠</span>
        <p className="text-red-400/70 text-[9px] font-mono leading-tight line-clamp-2">
          {result.error}
        </p>
      </div>
    );
  }

  // Done with image
  return (
    <div
      className="img-slot rounded-md overflow-hidden cursor-pointer relative group bg-lab-bg"
      onClick={() => onOpenDetail(result)}
    >
      <img
        src={`data:${result.mimeType};base64,${result.imageData}`}
        alt={`${result.model} #${result.index + 1}`}
        className="w-full h-full object-cover"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-md bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
        <span className="font-mono text-[10px] text-white/90 bg-black/40 px-2 py-0.5 rounded">
          {result.elapsed}s · 클릭하여 확대
        </span>
      </div>

      {/* Time badge */}
      <span className="absolute bottom-1 right-1 font-mono text-[8px] bg-black/50 text-white/60 px-1 py-px rounded">
        {result.elapsed}s
      </span>
    </div>
  );
}

/* ─── Model section (compact) ─── */
function ModelSection({
  model,
  results,
  onOpenDetail,
}: {
  model: ModelConfig;
  results: ImageResult[];
  onOpenDetail: (r: ImageResult) => void;
}) {
  const doneCount = results.filter((r) => r.status === "done").length;
  const errorCount = results.filter((r) => r.status === "error").length;
  const isAnyGenerating = results.some((r) => r.status === "generating");

  return (
    <section>
      {/* Model header */}
      <div className="flex items-center gap-2 mb-1.5 model-line">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isAnyGenerating ? "animate-pulse-ring" : ""}`}
            style={{ backgroundColor: model.color }}
          />
          <h2 className="font-display text-[12px] font-semibold text-lab-text">
            {model.name}
          </h2>
          <span
            className="font-mono text-[8px] px-1.5 py-px rounded-full border"
            style={{
              color: model.color,
              borderColor: model.color + "40",
              backgroundColor: model.color + "10",
            }}
          >
            {model.badge}
          </span>
        </div>
        {(doneCount > 0 || errorCount > 0) && (
          <div className="flex gap-1.5 ml-1">
            {doneCount > 0 && (
              <span className="font-mono text-[9px] text-green-500/60">
                ✓{doneCount}
              </span>
            )}
            {errorCount > 0 && (
              <span className="font-mono text-[9px] text-red-400/60">
                ⚠{errorCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {results.map((result) => (
          <ImageSlot
            key={result.id}
            result={result}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Main grid ─── */
export default function ResultGrid({ results, onDownloadAll }: ResultGridProps) {
  const hasAnyResults = results.some((r) => r.status === "done");
  const [detailResult, setDetailResult] = useState<ImageResult | null>(null);

  return (
    <div className="h-full flex flex-col bg-lab-bg">
      {/* Header bar */}
      <div className="px-5 py-2 border-b border-lab-border flex items-center justify-between bg-lab-surface/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-display text-[12px] font-medium text-lab-muted">
            생성 결과
          </span>
          <span className="font-mono text-[9px] text-lab-muted/40">
            {MODELS.length} models × {IMAGES_PER_MODEL} images
          </span>
        </div>
        {hasAnyResults && (
          <button
            onClick={onDownloadAll}
            className="font-mono text-[10px] text-lab-muted hover:text-banana-500 transition-colors px-2.5 py-1 rounded border border-lab-border hover:border-banana-500/30"
          >
            전체 다운로드
          </button>
        )}
      </div>

      {/* Results area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-3 space-y-3">
        {MODELS.map((model) => {
          const modelResults = results.filter((r) => r.model === model.id);
          return (
            <ModelSection
              key={model.id}
              model={model}
              results={modelResults}
              onOpenDetail={setDetailResult}
            />
          );
        })}

        {/* Empty state */}
        {results.every((r) => r.status === "idle") && (
          <div className="flex flex-col items-center justify-center h-full text-center pb-16">
            <div className="text-5xl mb-3 opacity-20">🍌</div>
            <p className="font-display text-base text-lab-muted/30 mb-1">
              아직 생성된 이미지가 없습니다
            </p>
            <p className="font-mono text-[10px] text-lab-muted/20">
              좌측 패널에서 프롬프트를 입력하고 배치 생성을 시작하세요
            </p>
          </div>
        )}
      </div>

      {/* Detail modal - renders at top level for proper z-index */}
      {detailResult && detailResult.status === "done" && (
        <DetailModal
          result={detailResult}
          onClose={() => setDetailResult(null)}
        />
      )}
    </div>
  );
}