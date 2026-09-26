# example-invoice-desk

> **Intentionally vulnerable. Do not deploy, and do not reuse this code.**
> This is a sample application for a [ZebraZones](https://www.zebrazones.com) security audit report with a **"Fix now"** verdict. It contains deliberate security flaws so that the report has something real to point at.

InvoiceDesk is a small invoicing app for freelancers, built the way Replit Agent builds apps: React and Vite on the frontend, Express and Drizzle on the backend, PostgreSQL for data, Stripe for payment links and OpenAI to draft line items.

## Running it locally

You need Node.js 20 and a PostgreSQL database (the code uses the Neon serverless driver).

```bash
npm install
export DATABASE_URL=postgres://...
export SESSION_SECRET=$(openssl rand -hex 32)
export OPENAI_API_KEY=...          # required at startup; any value works if you skip AI line items
export VITE_STRIPE_SECRET_KEY=...  # optional, use a Stripe test key only
npm run db:push
npm run dev
```

The app runs on http://localhost:5000.

## About the audit

The findings, their impact and the fixes are described in the ZebraZones sample report. Want the same for your own app? Paste your repository at [zebrazones.com](https://www.zebrazones.com).
