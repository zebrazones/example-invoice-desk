import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Copy, CreditCard, Loader2, Trash2 } from "lucide-react";
import type { InvoiceWithItems } from "@shared/schema";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createPaymentLink } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/utils";

const STATUSES = ["draft", "sent", "paid", "overdue"] as const;

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  const { data: invoice, isLoading, error } = useQuery<InvoiceWithItems>({
    queryKey: ["/api/invoices", id],
  });

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not update status", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
      navigate("/");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => createPaymentLink(invoice!),
    onSuccess: (url) => {
      setPaymentUrl(url);
      if (invoice?.status === "draft") statusMutation.mutate("sent");
    },
    onError: (err: Error) => {
      toast({ title: "Could not create payment link", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-4xl px-4 py-8">
          <p className="text-muted-foreground">Invoice not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All invoices
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-muted-foreground">
              Issued {format(new Date(invoice.issueDate), "MMM d, yyyy")} · Due{" "}
              {format(new Date(invoice.dueDate), "MMM d, yyyy")}
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={invoice.status}
              onChange={(e) => statusMutation.mutate(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm capitalize"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button variant="outline" size="icon" onClick={() => deleteMutation.mutate()} title="Delete invoice">
              <Trash2 />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg">Bill to</CardTitle>
              <p className="mt-2 font-medium">{invoice.clientName}</p>
              <p className="text-sm text-muted-foreground">{invoice.clientEmail}</p>
              {invoice.clientAddress && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{invoice.clientAddress}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Amount due</p>
              <p className="text-3xl font-bold">{formatMoney(invoice.total, invoice.currency)}</p>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatMoney(item.unitPrice, invoice.currency)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(item.quantity * item.unitPrice, invoice.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {invoice.notes && (
              <p className="mt-6 whitespace-pre-line border-t pt-4 text-sm text-muted-foreground">{invoice.notes}</p>
            )}
          </CardContent>
        </Card>

        {invoice.status !== "paid" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5" /> Get paid online
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Create a Stripe payment link and send it to {invoice.clientName}. They can pay by card in a few clicks.
              </p>
              {paymentUrl ? (
                <div className="flex gap-2">
                  <Input readOnly value={paymentUrl} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentUrl);
                      toast({ title: "Link copied" });
                    }}
                  >
                    <Copy /> Copy
                  </Button>
                </div>
              ) : (
                <Button onClick={() => paymentMutation.mutate()} disabled={paymentMutation.isPending}>
                  {paymentMutation.isPending && <Loader2 className="animate-spin" />}
                  Create payment link
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
