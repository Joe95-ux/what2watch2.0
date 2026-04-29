"use client";

import { useCallback, useEffect, useRef } from "react";

export function useAutoGrowingTextarea(value: string) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [resize, value]);

  return { textareaRef, resize };
}
