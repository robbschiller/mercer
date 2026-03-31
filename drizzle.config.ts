import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js; load the same env files as local dev
config({ path: resolve(process.cwd(), ".env"), quiet: true });
config({
  path: resolve(process.cwd(), ".env.local"),
  override: true,
  quiet: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.local.example) and run db:push again."
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Supabase exposes many schemas; limiting introspection avoids a drizzle-kit
  // bug when parsing some CHECK constraints (TypeError on checkValue.replace).
  schemaFilter: ["public"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
