"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import type { RunEvent } from "@/lib/types/run-events";

export interface RegenerateInput {
  focus?: string;
  addressGaps?: boolean;
}

export interface RegenerateState {
  isStreaming: boolean;
  body: string;
  error: string | null;
  status: "idle" | "running" | "done" | "failed";
}

const initialState: RegenerateState = {
  isStreaming: false,
  body: "",
  error: null,
  status: "idle",
};

export function useRegenerate(generationId: string) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<RegenerateState>(initialState);
  const controllerRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (input: RegenerateInput) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setState({ ...initialState, isStreaming: true, status: "running" });

      try {
        const response = await fetch(
          `/api/generations/${generationId}/regenerate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
            signal: controller.signal,
          }
        );

        if (!response.ok || !response.body) {
          const message = await response.text().catch(() => "Failed to start");
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: message,
            status: "failed",
          }));
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
            const dataLine = block
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const event = JSON.parse(dataLine.slice(6)) as RunEvent;
              applyEvent(setState, event);
            } catch {
              continue;
            }
          }
        }

        setState((prev) => ({ ...prev, isStreaming: false }));
        await queryClient.invalidateQueries({
          queryKey: queryKeys.generations.detail(generationId),
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        const message =
          error instanceof Error ? error.message : "Regenerate failed";
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: message,
          status: "failed",
        }));
      }
    },
    [generationId, queryClient]
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  return { ...state, start, cancel };
}

function applyEvent(
  setState: React.Dispatch<React.SetStateAction<RegenerateState>>,
  event: RunEvent
) {
  switch (event.type) {
    case "token":
      setState((prev) => ({ ...prev, body: prev.body + event.delta }));
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
    default:
      return;
  }
}
