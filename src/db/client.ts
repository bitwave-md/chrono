import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const localDatabaseUrl = "postgresql://chrono:chrono@localhost:5432/chrono";

export class DatabaseConnection {
  readonly orm: NodePgDatabase<typeof schema>;

  readonly #pool: Pool;

  constructor(databaseUrl: string) {
    this.#pool = new Pool({
      connectionString: databaseUrl,
      max: process.env.NODE_ENV === "production" ? 10 : 5,
    });
    this.orm = drizzle(this.#pool, { schema });
  }

  async healthcheck(): Promise<void> {
    await this.#pool.query("select 1");
  }

  async close(): Promise<void> {
    await this.#pool.end();
  }
}

declare global {
  var chronoDatabase: DatabaseConnection | undefined;
}

function createDatabaseConnection(): DatabaseConnection {
  return new DatabaseConnection(process.env.DATABASE_URL ?? localDatabaseUrl);
}

export const database =
  globalThis.chronoDatabase ?? createDatabaseConnection();

if (process.env.NODE_ENV !== "production") {
  globalThis.chronoDatabase = database;
}

export const db = database.orm;
