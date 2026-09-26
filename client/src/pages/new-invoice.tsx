import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format, addDays } from "date-fns";
import { z } from "zod";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { insertInvoiceSchema, type InvoiceWithItems } from "@shared/schema";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/utils";

type FormValues = z.infer<typeof insertInvoiceSchema>;

export default function NewInvoice() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [aiDescription, setAiDescription] = useState("");

  const today = new Date();
  const form = useForm<FormValues>({
    resolver: zodResolver(insertInvoiceSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientAddress: "",
      currency: "usd",
      issueDate: format(today, "yyyy-MM-dd"),
      dueDate: format(addDays(today, 14), "yyyy-MM-dd"),
      notes: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: "items" });
  const items = form.watch("items");
  const currency = form.watch("currency");
  const total = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      return (await res.json()) as InvoiceWithItems;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice created", description: `${invoice.number} is ready to send.` });
      navigate(`/invoices/${invoice.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Could not create invoice", description: error.message, variant: "destructive" });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/generate-invoice", {
        description: aiDescription,
        currency,
      });
      return (await res.json()) as { items: FormValues["items"]; notes: string };
    },
    onSuccess: (generated) => {
      if (generated.items.length) replace(generated.items);
      if (generated.notes) form.setValue("notes", generated.notes);
      toast({ title: "Line items generated", description: "Review them before saving." });
    },
    onError: (error: Error) => {
      toast({ title: "AI generation failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">New invoice</h1>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> Write it for me
            </CardTitle>
            <CardDescription>
              Describe the work you did in plain words and we'll turn it into line items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={3}
              placeholder="e.g. Designed a new logo and 3 social media templates for Bloom Bakery, about 12 hours at $85/h, plus stock photo license $40"
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => generateMutation.mutate()}
              disabled={!aiDescription.trim() || generateMutation.isPending}
            >
              {generateMutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Generate line items
            </Button>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Client</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientAddress"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Billing address (optional)</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Line items</CardTitle>
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <select
                      {...field}
                      className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                      <option value="gbp">GBP</option>
                    </select>
                  )}
                />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="hidden grid-cols-[1fr_90px_140px_40px] gap-3 text-xs font-medium text-muted-foreground md:grid">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit price (cents)</span>
                  <span />
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="grid gap-3 md:grid-cols-[1fr_90px_140px_40px]">
                    <Input placeholder="Description" {...form.register(`items.${index}.description`)} />
                    <Input type="number" min={1} {...form.register(`items.${index}.quantity`)} />
                    <Input type="number" min={0} {...form.register(`items.${index}.unitPrice`)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
                >
                  <Plus /> Add item
                </Button>
                <div className="flex justify-end border-t pt-4 text-lg font-semibold">
                  Total: {formatMoney(total, currency)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Payment terms, thank-you note, bank details..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate("/")}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="animate-spin" />}
                Create invoice
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}
