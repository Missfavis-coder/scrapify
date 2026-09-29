
"use client";

import { useRouter } from "nextjs-toploader/app";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import debounce from "lodash.debounce";
import {
  PiSpinnerGap,
} from "react-icons/pi";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  History,
  Play,
  RotateCcw,
  Workflow,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ReceiptCard from "@/components/dashboard/receipt-card";

import {
  ModeSelector,
  type ModeSelectorHandle,
} from "@/components/home/mode-selector";

import { isValidUrl } from "@/lib/utils/url";
import { detectModeFromUrl } from "@/lib/utils/detect-mode";
import {
  SAMPLE_PICK_EVENT,
  type SamplePickDetail,
} from "@/lib/utils/sample-pick";
import {
  URL_PLACEHOLDERS,
  URL_PLACEHOLDER_INTERVAL_MS,
} from "@/lib/constants/url-placeholders";
import type { GenerationMode } from "@/lib/types/generation";
import UrlInput from "./_components/url-input";
import RecentActivity from "./_components/home-activity";
import { DEFAULT_MODE, MODES } from "@/lib/constants/modes";

const FormSchema = z.object({
  url: z.string().min(4).refine(isValidUrl, "Enter a valid URL"),
});

type FormValues = z.infer<typeof FormSchema>;

const DETECT_DEBOUNCE_MS = 250;


const replaySteps = [
  "Open website",
  "Sign in",
  "Find report",
  "Download",
];


export default function HomePage() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const [mode, setMode] =
    useState<GenerationMode>(DEFAULT_MODE);

  const [isNavigating, setIsNavigating] = useState(false);
  const [detectionReason, setDetectionReason] =
    useState<string | null>(null);

  const overriddenRef = useRef(false);
  const modeRef = useRef<ModeSelectorHandle>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const isInputEmpty = url.length === 0;

  useEffect(() => {
    if (!isInputEmpty) return;

    const id = window.setInterval(() => {
      setPlaceholderIndex(
        (i) => (i + 1) % URL_PLACEHOLDERS.length
      );
    }, URL_PLACEHOLDER_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [isInputEmpty]);

  const debouncedDetect = useMemo(
    () =>
      debounce((value: string) => {
        if (overriddenRef.current) return;

        if (!isValidUrl(value)) {
          setDetectionReason(null);
          return;
        }

        const detection = detectModeFromUrl(value);

        setMode(detection.mode);
        setDetectionReason(detection.reason);
      }, DETECT_DEBOUNCE_MS),
    []
  );

  useEffect(() => {
    debouncedDetect(url);
  }, [url, debouncedDetect]);

  useEffect(() => {
    return () => debouncedDetect.cancel();
  }, [debouncedDetect]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail =
        (event as CustomEvent<SamplePickDetail>).detail;

      if (!detail) return;

      setUrl(detail.url);

      overriddenRef.current = true;
      setMode(detail.mode);
      setDetectionReason(null);

      const el = inputRef.current;

      if (el) {
        el.focus();
        el.setSelectionRange(
          detail.url.length,
          detail.url.length
        );
      }
    };

    window.addEventListener(SAMPLE_PICK_EVENT, handler);

    return () => {
      window.removeEventListener(
        SAMPLE_PICK_EVENT,
        handler
      );
    };
  }, []);

  const handleManualModeChange = useCallback(
    (next: GenerationMode) => {
      overriddenRef.current = true;
      setMode(next);
    },
    []
  );

  const handleChangeClick = useCallback(() => {
    overriddenRef.current = true;
    modeRef.current?.focus();
  }, []);


  const handleCreateAutomation = () => {
    const parsed = FormSchema.safeParse({
      url,
    });

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ??
          "Enter a valid URL"
      );
      return;
    }

    if (!description.trim()) {
      toast.error("Describe the task you want to automate");
      return;
    }

    setIsNavigating(true);

    const workflowId = crypto.randomUUID();

    const workflow = {
      id: workflowId,
      url: parsed.data.url,
      description: description.trim(),
      mode,
      createdAt: new Date().toISOString(),
      status: "Draft",
    };

    localStorage.setItem(
      `workflow-${workflowId}`,
      JSON.stringify(workflow)
    );

    router.push(`/dashboard/automations/${workflowId}`);
  };

  const isPending = isNavigating;

  const detectedLabel =
    MODES.find((m) => m.id === mode)?.label ?? mode;

  const hasValidUrl = isValidUrl(url);

  const showDetection =
    !overriddenRef.current &&
    detectionReason !== null;

  const showModeSelector =
    hasValidUrl &&
    (detectionReason !== null ||
      overriddenRef.current);

  const handleReplay = () => {
    if (isReplaying) return;

    setIsReplaying(true);
    setActiveStep(0);

    replaySteps.forEach((_, index) => {
      window.setTimeout(() => {
        setActiveStep(index);
      }, index * 900);
    });

    window.setTimeout(() => {
      setIsReplaying(false);
      setActiveStep(-1);
    }, replaySteps.length * 900 + 700);
  };

  const [isReplaying, setIsReplaying] =
    useState(false);

  const [activeStep, setActiveStep] =
    useState(-1);

  return (
    <div className="min-h-screen mt-16 ">
      <main className="min-w-0">
        <div className="px-4 py-7 sm:px-8 lg:px-10 lg:py-12">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateAutomation();
            }}
          >
            <div className="grid grid-cols-1 md:gap-8 gap-16 md:grid-cols-2">
              {/* Create automation */}
              <section>
                <div
                  className="px-2 md:pt-10 pt-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div>
                      <h2 className="text-xl font-semibold">
                        Paste the URL
                      </h2>

                      <p className="mt-0.5 text-sm font-medium tracking-wide text-neutral-500">
                        Describe the task and let the
                        system turn it into a workflow.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 p-2 sm:p-2">
                  <div className="grid gap-8">
                    {/* URL */}
                    <div>
                      <label
                        htmlFor="automation-url"
                        className="mb-2 block text-sm font-medium text-primary"
                      >
                        Website URL
                      </label>

                      <UrlInput
                        value={url}
                        onChange={setUrl}
                        inputRef={inputRef}
                        mode={mode}
                        setMode={setMode}
                        detectionReason={
                          detectionReason
                        }
                        setDetectionReason={
                          setDetectionReason
                        }
                        overriddenRef={
                          overriddenRef
                        }
                        modeRef={modeRef}
                        placeholderIndex={
                          placeholderIndex
                        }
                        isPending={isPending}
                        onManualModeChange={
                          handleManualModeChange
                        }
                        onChangeClick={
                          handleChangeClick
                        }
                        showDetection={
                          showDetection
                        }
                        showModeSelector={
                          showModeSelector
                        }
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="automation-description"
                        className="mb-2 block text-sm font-medium text-primary"
                      >
                        Task description
                      </label>

                      <input
                        id="automation-description"
                        type="text"
                        value={description}
                        onChange={(event) =>
                          setDescription(
                            event.target.value
                          )
                        }
                        placeholder="e.g. Find the latest report and download it"
                        className="h-14 w-full rounded-full border border-neutral-200 pl-4 pr-4 text-sm outline-none transition placeholder:text-neutral-600  focus:ring-2 focus:ring-[#b70569] bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Homepage submission */}
                  <div className="mt-4 flex flex-col justify-between gap-3 pt-4 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      disabled={
                        isPending ||
                        !url ||
                        !description.trim()
                      }
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-neutral-800 px-6 text-sm text-white transition hover:bg-[#b70569] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isPending ? (
                        <>
                          <PiSpinnerGap className="size-4 animate-spin" />
                          Generating
                        </>
                      ) : (
                        <>
                          Create automation
                          <ArrowUpRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              <section>
              <ReceiptCard
  titleLines={["Automation", "Receipt"]}
  items={[
    { label: "Completed", amount: "24" },
    { label: "Scheduled", amount: "8" },
    { label: "Needs attention", amount: "3" },
  ]}
  totalLabel="Total runs"
  totalAmount="35"
  footerNote="Automation activity"
  validText="Updated today"
/>
              </section>
            </div>
          </form>

          <RecentActivity/>

        </div>
      </main>
    </div>
  );
}






