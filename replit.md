# InvoiceDesk

## Overview

InvoiceDesk is a simple invoicing app for freelancers. Users sign up, create invoices for their clients (manually or by describing their work and letting AI generate the line items), track invoice status, and collect payments online through Stripe payment links. There is an admin area with platform-wide stats and a user list.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, built with Vite
- **Routing**: wouter
- **State / data fetching**: TanStack Query, with a shared `apiRequest` helper in `client/src/lib/queryClient.ts`
- **UI**: shadcn/ui components (Radix UI primitives) with Tailwind CSS
- **Forms**: react-hook-form with zod validation, reusing the insert schemas from `shared/schema.ts`

### Backend
- **Runtime**: Node.js with Express, written in TypeScript (run with tsx in development, bundled with esbuild for production)
- **API**: REST endpoints under `/api`, registered in `server/routes.ts`
- **Authentication**: Passport local strategy with username and password, passwords hashed with scrypt, sessions stored in PostgreSQL via connect-pg-simple
- **Storage layer**: `IStorage` interface in `server/storage.ts`, implemented by `DatabaseStorage`

### Data
- **Database**: PostgreSQL (Neon) through Drizzle ORM
- **Schema**: `shared/schema.ts` defines `users`, `invoices` and `invoice_items`. Amounts are stored as integers in cents.
- **Migrations**: `npm run db:push` (drizzle-kit push)

### Features
- **Invoices**: create, list, view, change status (draft, sent, paid, overdue), delete. Invoice numbers are generated per user (INV-0001, INV-0002, ...).
- **AI line items**: `POST /api/ai/generate-invoice` sends the user's description to OpenAI (gpt-5, JSON mode) and returns line items and a note. Implemented in `server/openai.ts`.
- **Payments**: the invoice page creates a Stripe Checkout session and shows the payment link to copy and send to the client. This calls the Stripe API directly from the frontend (`client/src/lib/stripe.ts`), so no extra backend endpoint is needed.
- **Admin**: `/admin` shows total users, invoices, invoiced and paid amounts, and a list of all users. The link only appears in the header for users with `role = "admin"`.

## External Dependencies

- **Neon PostgreSQL**: `DATABASE_URL`
- **OpenAI**: `OPENAI_API_KEY`
- **Stripe**: `VITE_STRIPE_SECRET_KEY` (used by the frontend to create Checkout sessions)
- **Sessions**: `SESSION_SECRET`

## Recent Changes

- Added "Write it for me" AI line item generation on the new invoice page
- Added Stripe payment links on the invoice page
- Added admin dashboard with user list and platform stats
- Initial invoicing app with auth, invoices and line items
