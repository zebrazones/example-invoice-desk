import type { Invoice } from "@shared/schema";

// Creates a Stripe Checkout session for an invoice and returns the payment URL.
// Calls the Stripe REST API directly so payment links work without an extra backend endpoint.
const STRIPE_SECRET_KEY = import.meta.env.VITE_STRIPE_SECRET_KEY as string | undefined;

export async function createPaymentLink(invoice: Invoice): Promise<string> {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured. Add VITE_STRIPE_SECRET_KEY in Secrets.");
  }

  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("customer_email", invoice.clientEmail);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", invoice.currency);
  params.append("line_items[0][price_data][unit_amount]", String(invoice.total));
  params.append("line_items[0][price_data][product_data][name]", `Invoice ${invoice.number}`);
  params.append("metadata[invoice_id]", String(invoice.id));
  params.append("success_url", `${window.location.origin}/invoices/${invoice.id}?paid=1`);
  params.append("cancel_url", `${window.location.origin}/invoices/${invoice.id}`);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Could not create payment link");
  }

  return data.url as string;
}
