import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateInvoiceFromDescription } from "./openai";
import { insertInvoiceSchema, invoiceStatusSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Invoices
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getInvoicesByUser(req.user!.id);
      res.json(invoices);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(Number(req.params.id));
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const result = insertInvoiceSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const invoice = await storage.createInvoice(req.user!.id, result.data);
      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/invoices/:id/status", requireAuth, async (req, res) => {
    try {
      const result = invoiceStatusSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const invoice = await storage.getInvoice(Number(req.params.id));
      if (!invoice || invoice.userId !== req.user!.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      const updated = await storage.updateInvoiceStatus(invoice.id, result.data.status);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoice = await storage.getInvoice(Number(req.params.id));
      if (!invoice || invoice.userId !== req.user!.id) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      await storage.deleteInvoice(invoice.id);
      res.sendStatus(204);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AI invoice generation
  app.post("/api/ai/generate-invoice", requireAuth, async (req, res) => {
    try {
      const { description, currency = "usd" } = req.body;
      if (!description || typeof description !== "string") {
        return res.status(400).json({ message: "Description is required" });
      }
      const generated = await generateInvoiceFromDescription(description, currency);
      res.json(generated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Admin
  app.get("/api/admin/stats", requireAuth, async (_req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/users", requireAuth, async (_req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
