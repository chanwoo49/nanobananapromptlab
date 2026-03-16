import { NextRequest, NextResponse } from "next/server";

// Vercel serverless function config
export const maxDuration = 60; // seconds (Hobby: 60, Pro: 300)

interface GenerateRequest {
  model: string;
  prompt: string;
  characterImage?: string; // base64 encoded PNG (no data: prefix)
  aspectRatio?: string;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const body: GenerateRequest = await request.json();
    const { model, prompt, characterImage, aspectRatio = "1:1" } = body;

    if (!model || !prompt) {
      return NextResponse.json(
        { error: "model과 prompt는 필수입니다." },
        { status: 400 }
      );
    }

    // Build the parts array
    const parts: any[] = [];

    // If character image is provided, include it as inline data
    if (characterImage) {
      parts.push({
        inline_data: {
          mime_type: "image/png",
          data: characterImage,
        },
      });
    }

    parts.push({ text: prompt });

    // Build the full request body
    const geminiBody: any = {
      contents: [
        {
          parts,
          role: "user",
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 1,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_LOW_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_LOW_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_LOW_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_LOW_AND_ABOVE",
        },
        {
          category: "HARM_CATEGORY_CIVIC_INTEGRITY",
          threshold: "BLOCK_LOW_AND_ABOVE",
        },
      ],
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const startTime = Date.now();
    const requestBody = JSON.stringify(geminiBody);

    // Check request size (Vercel limit ~4.5MB, Gemini limit ~20MB)
    const requestSizeMB = new Blob([requestBody]).size / (1024 * 1024);
    if (requestSizeMB > 4) {
      return NextResponse.json(
        {
          error: `요청 크기가 너무 큽니다 (${requestSizeMB.toFixed(1)}MB). 캐릭터 이미지를 더 작은 파일로 교체해주세요.`,
          elapsed: "0",
        },
        { status: 413 }
      );
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Safe JSON parsing — API가 JSON이 아닌 텍스트를 반환할 수 있음
    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: `Gemini API 오류 (HTTP ${response.status}): ${rawText.slice(0, 200)}`,
          elapsed,
        },
        { status: response.status || 500 }
      );
    }

    // Handle API errors
    if (data.error) {
      return NextResponse.json(
        {
          error: data.error.message || JSON.stringify(data.error),
          code: data.error.code,
          elapsed,
        },
        { status: data.error.code || 500 }
      );
    }

    // Handle safety blocks
    if (data.promptFeedback?.blockReason) {
      return NextResponse.json(
        {
          error: `프롬프트가 차단되었습니다: ${data.promptFeedback.blockReason}`,
          blockReason: data.promptFeedback.blockReason,
          safetyRatings: data.promptFeedback.safetyRatings,
          elapsed,
        },
        { status: 422 }
      );
    }

    // Check for candidates
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      const finishReason = candidate?.finishReason || "UNKNOWN";
      return NextResponse.json(
        {
          error: `이미지 생성 실패 (사유: ${finishReason})`,
          finishReason,
          safetyRatings: candidate?.safetyRatings,
          elapsed,
        },
        { status: 422 }
      );
    }

    // Extract image and text from response
    let imageData: string | null = null;
    let mimeType = "image/png";
    let responseText = "";

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType || "image/png";
      }
      if (part.text) {
        responseText += part.text;
      }
    }

    if (!imageData) {
      return NextResponse.json(
        {
          error: "응답에 이미지가 포함되지 않았습니다.",
          text: responseText,
          finishReason: candidate.finishReason,
          elapsed,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      imageData,
      mimeType,
      text: responseText,
      elapsed,
      model,
      finishReason: candidate.finishReason,
      safetyRatings: candidate.safetyRatings,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}