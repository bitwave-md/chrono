import { defineConfig } from "drizzle-kit";

const localDatabaseUrl = "postgresql://chrono:chrono@localhost:5432/chrono";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? localDatabaseUrl,
  },
  strict: true,
  verbose: true,
});
