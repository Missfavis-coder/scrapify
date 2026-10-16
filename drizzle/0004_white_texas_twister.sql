ALTER TABLE "automations"
ADD COLUMN "public_id" varchar(20);
--> statement-breakpoint

UPDATE "automations"
SET "public_id" = 'scf_' || SUBSTRING(
  REPLACE(gen_random_uuid()::text, '-', ''),
  1,
  12
)
WHERE "public_id" IS NULL;
--> statement-breakpoint

ALTER TABLE "automations"
ADD CONSTRAINT "automations_public_id_unique"
UNIQUE("public_id");
--> statement-breakpoint

ALTER TABLE "automations"
ALTER COLUMN "public_id" SET NOT NULL;