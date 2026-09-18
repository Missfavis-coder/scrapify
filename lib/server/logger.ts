type LogFields = Record<string, unknown>;

const PREFIX = "[skill]";

function emit(level: "info" | "error", event: string, fields: LogFields): void {
  const line = `${PREFIX} ${level === "error" ? "ERR" : "OK "} ${event} ${JSON.stringify(fields)}`;
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export function logEvent(event: string, fields: LogFields = {}): void {
  emit("info", event, fields);
}

export function logError(
  event: string,
  error: unknown,
  fields: LogFields = {}
): void {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : undefined;
  emit("error", event, { ...fields, error: message, errorName: name });
}

export function startTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
