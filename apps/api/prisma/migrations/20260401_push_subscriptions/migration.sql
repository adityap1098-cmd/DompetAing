-- Push Subscriptions (FCM tokens)
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fcm_token" TEXT NOT NULL,
    "device" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- Add notif_push column to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notif_push" BOOLEAN NOT NULL DEFAULT true;

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_user_id_fcm_token_key" ON "push_subscriptions"("user_id", "fcm_token");
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_id_is_active_idx" ON "push_subscriptions"("user_id", "is_active");

-- Foreign key
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
