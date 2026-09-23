"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RunEvent } from "@/lib/types/run-events";
import type { GenerationStatus } from "@/lib/types/generation";

interface RunArtifacts {
  screenshotAbove: string | null;
  screenshotFull: string | null;
  colors: string[];
  fonts: string[];
  pageTitle: string | null;
  sourceHost: string | null;
}

interface RunMeta {
  name: string;
  description: string;
  slug: string;
}

export interface RunState {
  status: GenerationStatus;
  body: string;
  artifacts: RunArtifacts;
  meta: RunMeta | null;
  isStreaming: boolean;
  error: string | null;
  restoredNotice: string | null;
}

const initialArtifacts: RunArtifacts = {
  screenshotAbove: null,
  screenshotFull: null,
  colors: [],
  fonts: [],
  pageTitle: null,
  sourceHost: null,
};

const initialState: RunState = {
  status: "pending",
  body: "",
  artifacts: initialArtifacts,
  meta: null,
  isStreaming: false,
  error: null,
  restoredNotice: null,
};

export function useRunGeneration(id: string | null) {
  const [state, setState] = useState<RunState>(initialState);

  const startedRef = useRef<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async (generationId: string) => {
    if (startedRef.current === generationId) return;
    startedRef.current = generationId;

    const controller = new AbortController();
    controllerRef.current = controller;

    setState((prev) => ({ ...prev, isStreaming: true, error: null }));

    try {
      const response = await fetch(`/api/generations/${generationId}/run`, {
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const message = await response.text().catch(() => "Failed to start");
        setState((prev) => ({ ...prev, error: message, isStreaming: false }));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const block of events) {
          const dataLine = block.split("\n").find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          const json = dataLine.slice("data: ".length);
          try {
            const event = JSON.parse(json) as RunEvent;
            applyEvent(setState, event);
          } catch {
            continue;
          }
        }
      }

      setState((prev) => ({ ...prev, isStreaming: false }));
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      const message = error instanceof Error ? error.message : "stream failed";
      setState((prev) => ({ ...prev, error: message, isStreaming: false }));
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    void start(id);
    return () => {
      controllerRef.current?.abort();
    };
  }, [id, start]);

  const restart = useCallback(() => {
    if (!id) return;
    controllerRef.current?.abort();
    startedRef.current = null;
    setState(initialState);
    void start(id);
  }, [id, start]);

  return { ...state, restart };
}

function applyEvent(
  setState: React.Dispatch<React.SetStateAction<RunState>>,
  event: RunEvent
) {
  switch (event.type) {
    case "status":
      setState((prev) => ({ ...prev, status: event.status }));
      return;
    case "artifacts":
      setState((prev) => ({
        ...prev,
        artifacts: {
          screenshotAbove: event.screenshotAbove,
          screenshotFull: event.screenshotFull,
          colors: event.colors,
          fonts: event.fonts,
          pageTitle: event.pageTitle,
          sourceHost: event.sourceHost,
        },
      }));
      return;
    case "screenshotFull":
      setState((prev) => ({
        ...prev,
        artifacts: { ...prev.artifacts, screenshotFull: event.screenshotFull },
      }));
      return;
    case "token":
      setState((prev) => ({ ...prev, body: prev.body + event.delta }));
      return;
    case "meta":
      setState((prev) => ({
        ...prev,
        meta: { name: event.name, description: event.description, slug: event.slug },
      }));
      return;
    case "restored":
      setState((prev) => ({ ...prev, restoredNotice: event.message }));
      return;
    case "done":
      setState((prev) => ({ ...prev, status: "done", isStreaming: false }));
      return;
    case "error":
      setState((prev) => ({
        ...prev,
        error: event.message,
        status: "failed",
        isStreaming: false,
      }));
      return;
  }
}
