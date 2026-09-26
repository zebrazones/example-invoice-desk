import {
  users,
  invoices,
  invoiceItems,
  type User,
  type InsertUser,
  type Invoice,
  type InvoiceWithItems,
  type InsertInvoice,
  type PublicUser,
} from "@shared/schema";
import { db, pool } from "./db";
import { eq, desc, sql, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface AdminStats {
  totalUsers: number;
  totalInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<(PublicUser & { invoiceCount: number; invoicedTotal: number })[]>;
  getInvoicesByUser(userId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<InvoiceWithItems | undefined>;
  createInvoice(userId: number, invoice: InsertInvoice): Promise<InvoiceWithItems>;
  updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined>;
  deleteInvoice(id: number): Promise<void>;
  getAdminStats(): Promise<AdminStats>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers() {
    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        businessName: users.businessName,
        role: users.role,
        createdAt: users.createdAt,
        invoiceCount: count(invoices.id),
        invoicedTotal: sql<number>`coalesce(sum(${invoices.total}), 0)`.mapWith(Number),
      })
      .from(users)
      .leftJoin(invoices, eq(invoices.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));
    return rows;
  }

  async getInvoicesByUser(userId: number): Promise<Invoice[]> {
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number): Promise<InvoiceWithItems | undefined> {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: { items: true },
    });
    return invoice || undefined;
  }

  async createInvoice(userId: number, data: InsertInvoice): Promise<InvoiceWithItems> {
    const { items, ...invoiceData } = data;
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    const [{ value: existing }] = await db
      .select({ value: count() })
      .from(invoices)
      .where(eq(invoices.userId, userId));
    const number = `INV-${String(existing + 1).padStart(4, "0")}`;

    return db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({ ...invoiceData, userId, number, total })
        .returning();
      const createdItems = await tx
        .insert(invoiceItems)
        .values(items.map((item) => ({ ...item, invoiceId: invoice.id })))
        .returning();
      return { ...invoice, items: createdItems };
    });
  }

  async updateInvoiceStatus(id: number, status: string): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ status })
      .where(eq(invoices.id, id))
      .returning();
    return invoice || undefined;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async getAdminStats(): Promise<AdminStats> {
    const [userCount] = await db.select({ value: count() }).from(users);
    const [invoiceTotals] = await db
      .select({
        count: count(),
        invoiced: sql<number>`coalesce(sum(${invoices.total}), 0)`.mapWith(Number),
        paid: sql<number>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.total} else 0 end), 0)`.mapWith(Number),
      })
      .from(invoices);

    return {
      totalUsers: userCount.value,
      totalInvoices: invoiceTotals.count,
      totalInvoiced: invoiceTotals.invoiced,
      totalPaid: invoiceTotals.paid,
    };
  }
}

export const storage = new DatabaseStorage();
