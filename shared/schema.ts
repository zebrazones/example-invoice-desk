import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  businessName: text("business_name"),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  number: text("number").notNull(),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientAddress: text("client_address"),
  status: text("status").notNull().default("draft"),
  currency: text("currency").notNull().default("usd"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  notes: text("notes"),
  total: integer("total").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  businessName: true,
});

export const insertInvoiceItemSchema = createInsertSchema(invoiceItems)
  .omit({ id: true, invoiceId: true })
  .extend({
    quantity: z.coerce.number().int().min(1),
    unitPrice: z.coerce.number().int().min(0),
  });

export const insertInvoiceSchema = createInsertSchema(invoices)
  .omit({ id: true, userId: true, number: true, total: true, createdAt: true, status: true })
  .extend({
    clientEmail: z.string().email(),
    items: z.array(insertInvoiceItemSchema).min(1, "Add at least one line item"),
  });

export const invoiceStatusSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue"]),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type PublicUser = Omit<User, "password">;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };
