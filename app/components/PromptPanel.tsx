"use client";

import { useState, useRef, useEffect } from "react";
import { CharacterOption, DEFAULT_CHARACTERS } from "../types";

interface PromptPanelProps {
  onGenerate: (prompt: string, characterBase64: string | null) => void;
  isGenerating: boolean;
  devPrompt: string;
  progress: { done: number; total: number };
}

export default function PromptPanel({
  onGenerate,
  isGenerating,
  devPrompt,
  progress,
}: PromptPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [charImages, setCharImages] = useState<Map<string, string>>(new Map());
  const [uploadedChars, setUploadedChars] = useState<CharacterOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // All characters = defaults + uploaded
  const allCharacters = [...DEFAULT_CHARACTERS, ...uploadedChars];

  // Convert image URL to base64
  const loadCharacterBase64 = async (url: string): Promise<string> => {
    // Check if already cached
    const cached = charImages.get(url);
    if (cached) return cached;

    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        setCharImages((prev) => new Map(prev).set(url, base64));
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  };

  // Handle file upload for custom character
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const id = `upload-${Date.now()}`;
      const objectUrl = URL.createObjectURL(file);

      setUploadedChars((prev) => [
        ...prev,
        {
          id,
          name: file.name.replace(/\.[^.]+$/, ""),
          thumbUrl: objectUrl,
          fullUrl: objectUrl,
        },
      ]);

      // Cache the base64 immediately
      setCharImages((prev) => new Map(prev).set(objectUrl, base64));
      setSelectedChar(id);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    let charBase64: string | null = null;

    if (selectedChar) {
      const char = allCharacters.find((c) => c.id === selectedChar);
      if (char) {
        charBase64 = charImages.get(char.fullUrl) || null;
        if (!charBase64) {
          try {
            charBase64 = await loadCharacterBase64(char.fullUrl);
          } catch {
            charBase64 = null;
          }
        }
      }
    }

    onGenerate(prompt.trim(), charBase64);
  };

  return (
    <div className="h-full flex flex-col bg-lab-surface border-r border-lab-border">
      {/* Header */}
      <div className="px-5 py-4 border-b border-lab-border flex items-center gap-3">
        <span className="text-2xl">🍌</span>
        <div>
          <h1 className="font-display text-[15px] font-bold text-banana-500 tracking-tight">
            Prompt Lab
          </h1>
          <p className="font-mono text-[10px] text-lab-muted tracking-wider">
            NANO BANANA RESEARCH
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Character Selection */}
        <section>
          <label className="font-mono text-[10px] text-lab-muted tracking-[0.15em] block mb-3">
            캐릭터 선택 (선택사항)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {/* None option */}
            <button
              onClick={() => setSelectedChar(null)}
              className={`character-card rounded-lg p-2 flex flex-col items-center gap-1 bg-lab-card ${
                selectedChar === null ? "selected" : ""
              }`}
            >
              <div className="w-12 h-12 rounded-md bg-lab-bg flex items-center justify-center text-lg text-lab-muted">
                ∅
              </div>
              <span className="text-[10px] text-lab-muted">없음</span>
            </button>

            {/* Character options */}
            {allCharacters.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedChar(char.id)}
                className={`character-card rounded-lg p-2 flex flex-col items-center gap-1 bg-lab-card ${
                  selectedChar === char.id ? "selected" : ""
                }`}
              >
                <div className="w-12 h-12 rounded-md bg-lab-bg overflow-hidden flex items-center justify-center">
                  <img
                    src={char.thumbUrl}
                    alt={char.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (
                        e.target as HTMLImageElement
                      ).parentElement!.innerHTML = `<span class="text-lg">🎭</span>`;
                    }}
                  />
                </div>
                <span className="text-[10px] text-lab-muted truncate w-full text-center">
                  {char.name}
                </span>
              </button>
            ))}

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="character-card rounded-lg p-2 flex flex-col items-center gap-1 bg-lab-card border-dashed !border-lab-border"
            >
              <div className="w-12 h-12 rounded-md bg-lab-bg flex items-center justify-center text-lg text-lab-muted">
                +
              </div>
              <span className="text-[10px] text-lab-muted">업로드</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </section>

        {/* Prompt Input */}
        <section>
          <label className="font-mono text-[10px] text-lab-muted tracking-[0.15em] block mb-2">
            프롬프트
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="생성하고 싶은 이미지를 설명해주세요... &#10;&#10;예: 이 캐릭터가 도쿄 시부야 거리에서 버블티를 마시고 있는 장면, 애니메이션 스타일, 따뜻한 오후 조명"
            rows={8}
            className="w-full bg-lab-bg border border-lab-border rounded-lg text-[13px] text-lab-text font-body p-3 leading-relaxed resize-none placeholder:text-lab-muted/40"
          />
          <p className="font-mono text-[10px] text-lab-muted/50 mt-1.5">
            {prompt.length}자 · 캐릭터 선택 시 이미지와 함께 전달됩니다
          </p>
        </section>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3 rounded-lg font-display text-sm font-semibold transition-all ${
            isGenerating
              ? "bg-banana-800/30 text-banana-600 cursor-wait"
              : !prompt.trim()
                ? "bg-lab-card text-lab-muted cursor-not-allowed"
                : "bg-gradient-to-r from-banana-500 to-banana-600 text-lab-bg hover:shadow-lg hover:shadow-banana-500/20 active:scale-[0.98]"
          }`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-banana-600 border-t-transparent rounded-full animate-spin" />
              생성 중 {progress.done}/{progress.total}
            </span>
          ) : (
            "🍌 3모델 × 5장 배치 생성"
          )}
        </button>

        {/* Dev Prompt Output */}
        {devPrompt && (
          <section>
            <label className="font-mono text-[10px] text-lab-muted tracking-[0.15em] block mb-2">
              API 전달 프롬프트
            </label>
            <div className="bg-lab-bg border border-lab-border rounded-lg p-3 max-h-48 overflow-y-auto">
              <pre className="font-mono text-[11px] text-green-400/80 whitespace-pre-wrap leading-relaxed">
                {devPrompt}
              </pre>
            </div>
            <div className="mt-2 flex gap-1.5 flex-wrap">
              {selectedChar && (
                <span className="font-mono text-[9px] bg-banana-900/30 text-banana-500 px-2 py-0.5 rounded">
                  + 캐릭터 이미지 첨부
                </span>
              )}
              <span className="font-mono text-[9px] bg-lab-card text-lab-muted px-2 py-0.5 rounded">
                safetySettings: BLOCK_LOW_AND_ABOVE
              </span>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-lab-border">
        <p className="font-mono text-[9px] text-lab-muted/40 text-center">
          API 키는 서버 환경변수로 관리됩니다
        </p>
      </div>
    </div>
  );
}
