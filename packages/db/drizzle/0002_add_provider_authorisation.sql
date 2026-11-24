CREATE TABLE "provider_authorisation" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"token_source" text NOT NULL,
	"account_id" text,
	"stored_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "provider_authorisation_account_id_unique" UNIQUE("account_id"),
	CONSTRAINT "provider_authorisation_user_provider_unique" UNIQUE("user_id","provider"),
	CONSTRAINT "provider_authorisation_provider_check" CHECK ("provider_authorisation"."provider" in ('spotify', 'tidal', 'apple_music')),
	CONSTRAINT "provider_authorisation_token_source_check" CHECK (("provider_authorisation"."token_source" = 'login_account' and "provider_authorisation"."account_id" is not null and "provider_authorisation"."stored_token" is null)
        or ("provider_authorisation"."token_source" = 'stored' and "provider_authorisation"."stored_token" is not null and "provider_authorisation"."account_id" is null))
);
--> statement-breakpoint
ALTER TABLE "provider_authorisation" ADD CONSTRAINT "provider_authorisation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_authorisation" ADD CONSTRAINT "provider_authorisation_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE cascade ON UPDATE no action;