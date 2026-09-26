import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedLineItem {
  description: string;
  quantity: number;
  unitPrice: number; // in cents
}

export interface GeneratedInvoice {
  items: GeneratedLineItem[];
  notes: string;
}

export async function generateInvoiceFromDescription(
  description: string,
  currency: string,
): Promise<GeneratedInvoice> {
  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [
      {
        role: "system",
        content:
          "You are an assistant that turns a freelancer's description of their work into invoice line items. " +
          "Respond with JSON in this format: { \"items\": [{ \"description\": string, \"quantity\": number, \"unitPrice\": number }], \"notes\": string }. " +
          `unitPrice is in the smallest unit of ${currency.toUpperCase()} (for example cents). Keep descriptions short and professional.`,
      },
      {
        role: "user",
        content: description,
      },
    ],
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  return {
    items: Array.isArray(result.items)
      ? result.items.map((item: any) => ({
          description: String(item.description ?? ""),
          quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
          unitPrice: Math.max(0, Math.round(Number(item.unitPrice) || 0)),
        }))
      : [],
    notes: typeof result.notes === "string" ? result.notes : "",
  };
}
