CREATE TYPE "public"."aisle" AS ENUM('fruits_legumes', 'boucherie', 'poissonnerie', 'cremerie', 'charcuterie_traiteur', 'epicerie_salee', 'epicerie_sucree', 'boulangerie', 'surgeles', 'boissons', 'bebe', 'entretien', 'hygiene', 'autre');--> statement-breakpoint
CREATE TYPE "public"."avoidance_reason" AS ENUM('allergie', 'gout', 'prix', 'composition', 'autre');--> statement-breakpoint
CREATE TYPE "public"."avoidance_scope" AS ENUM('brand', 'ingredient', 'product');--> statement-breakpoint
CREATE TYPE "public"."candidate_confidence" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('pending', 'accepted', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."list_item_source" AS ENUM('plan', 'manual', 'recurring');--> statement-breakpoint
CREATE TYPE "public"."list_status" AS ENUM('draft', 'ordered');--> statement-breakpoint
CREATE TYPE "public"."meal_effort" AS ENUM('express', 'standard', 'projet');--> statement-breakpoint
CREATE TYPE "public"."meal_kind" AS ENUM('recipe', 'combo', 'leftover_base');--> statement-breakpoint
CREATE TYPE "public"."meal_slot" AS ENUM('midi', 'soir');--> statement-breakpoint
CREATE TABLE "avoidance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"scope" "avoidance_scope" NOT NULL,
	"value" text NOT NULL,
	"reason" "avoidance_reason" DEFAULT 'autre' NOT NULL,
	"is_hard" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_preference" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"store_id" uuid,
	"aisle" "aisle",
	"ingredient_id" uuid,
	"brand" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"invite_code" text NOT NULL,
	"mcp_token_hash" text,
	"mcp_token_created_at" timestamp with time zone,
	"constraints" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"aisle" "aisle" DEFAULT 'autre' NOT NULL,
	"default_unit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"ingredient_id" uuid,
	"quantity" numeric,
	"unit" text,
	"is_pantry_staple" boolean DEFAULT false NOT NULL,
	"free_text" text,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"meal_id" uuid NOT NULL,
	"date" date NOT NULL,
	"slot" "meal_slot" DEFAULT 'soir' NOT NULL,
	"liked_by_baby" boolean,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "meal_kind" DEFAULT 'combo' NOT NULL,
	"effort" "meal_effort" DEFAULT 'standard' NOT NULL,
	"steps" text,
	"notes" text,
	"baby_note" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"season" text[] DEFAULT '{}' NOT NULL,
	"source_url" text,
	"rating" integer,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"date" date NOT NULL,
	"slot" "meal_slot" NOT NULL,
	"meal_id" uuid,
	"free_text" text
);
--> statement-breakpoint
CREATE TABLE "product_candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"raw_label" text NOT NULL,
	"dedupe_key" text NOT NULL,
	"guessed_ingredient_name" text,
	"guessed_ingredient_id" uuid,
	"brand" text,
	"format" text,
	"external_id" text,
	"price" numeric,
	"occurrences" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" "candidate_confidence" DEFAULT 'low' NOT NULL,
	"source" text,
	"status" "candidate_status" DEFAULT 'pending' NOT NULL,
	"batch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"label" text NOT NULL,
	"brand" text,
	"format" text,
	"external_id" text,
	"product_url" text,
	"last_price" numeric,
	"last_seen_at" timestamp with time zone,
	"is_preferred" boolean DEFAULT false NOT NULL,
	"is_unavailable" boolean DEFAULT false NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"default_quantity" numeric,
	"frequency_weeks" integer DEFAULT 1 NOT NULL,
	"last_added_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rejected_product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"ingredient_id" uuid,
	"store_id" uuid NOT NULL,
	"label" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_list_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"list_id" uuid NOT NULL,
	"ingredient_id" uuid,
	"product_id" uuid,
	"label" text NOT NULL,
	"quantity" numeric,
	"unit" text,
	"aisle" "aisle" DEFAULT 'autre' NOT NULL,
	"is_checked" boolean DEFAULT false NOT NULL,
	"source" "list_item_source" DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"store_id" uuid,
	"status" "list_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ordered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "store_rule" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"rule" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"base_url" text,
	"house_brands" text[] DEFAULT '{}' NOT NULL,
	"pickup_hours" text,
	"address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "avoidance" ADD CONSTRAINT "avoidance_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_preference" ADD CONSTRAINT "brand_preference_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_preference" ADD CONSTRAINT "brand_preference_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_preference" ADD CONSTRAINT "brand_preference_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_ingredient" ADD CONSTRAINT "meal_ingredient_meal_id_meal_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_ingredient" ADD CONSTRAINT "meal_ingredient_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log" ADD CONSTRAINT "meal_log_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_log" ADD CONSTRAINT "meal_log_meal_id_meal_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal" ADD CONSTRAINT "meal_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entry" ADD CONSTRAINT "plan_entry_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entry" ADD CONSTRAINT "plan_entry_meal_id_meal_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_candidate" ADD CONSTRAINT "product_candidate_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_candidate" ADD CONSTRAINT "product_candidate_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_candidate" ADD CONSTRAINT "product_candidate_guessed_ingredient_id_ingredient_id_fk" FOREIGN KEY ("guessed_ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_item" ADD CONSTRAINT "recurring_item_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_item" ADD CONSTRAINT "recurring_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_product" ADD CONSTRAINT "rejected_product_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_product" ADD CONSTRAINT "rejected_product_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejected_product" ADD CONSTRAINT "rejected_product_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_item" ADD CONSTRAINT "shopping_list_item_list_id_shopping_list_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."shopping_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_item" ADD CONSTRAINT "shopping_list_item_ingredient_id_ingredient_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_item" ADD CONSTRAINT "shopping_list_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list" ADD CONSTRAINT "shopping_list_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list" ADD CONSTRAINT "shopping_list_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_rule" ADD CONSTRAINT "store_rule_store_id_store_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."store"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store" ADD CONSTRAINT "store_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_household_slug_idx" ON "ingredient" USING btree ("household_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_household_slug_idx" ON "meal" USING btree ("household_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_entry_slot_idx" ON "plan_entry" USING btree ("household_id","date","slot");--> statement-breakpoint
CREATE UNIQUE INDEX "product_candidate_dedupe_idx" ON "product_candidate" USING btree ("store_id","dedupe_key");--> statement-breakpoint
CREATE UNIQUE INDEX "user_household_email_idx" ON "user" USING btree ("household_id","email");