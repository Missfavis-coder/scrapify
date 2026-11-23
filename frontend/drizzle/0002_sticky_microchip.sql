ALTER TABLE "runs" ADD COLUMN "stage" varchar(40) DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "current_action" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "error_code" varchar(100);--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "error_detail" text;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "cancel_requested_at" timestamp with time zone;