import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  address: text("address").notNull(),
  clientName: text("client_name").notNull(),
  notes: text("notes").notNull().default(""),
  status: text("status", {
    enum: ["draft", "sent", "won", "lost"],
  })
    .notNull()
    .default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
