import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";

export const bids = pgTable("bids", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  propertyName: text("property_name").notNull(),
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

export const buildings = pgTable("buildings", {
  id: uuid("id").primaryKey().defaultRandom(),
  bidId: uuid("bid_id")
    .notNull()
    .references(() => bids.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  count: integer("count").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const surfaces = pgTable("surfaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => buildings.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  dimensions: jsonb("dimensions").$type<number[][]>(),
  totalSqft: numeric("total_sqft"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
