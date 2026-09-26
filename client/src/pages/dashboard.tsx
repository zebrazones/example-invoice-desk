import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Plus, Loader2, FileText } from "lucide-react";
import type { Invoice } from "@shared/schema";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { formatMoney } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const outstanding = (invoices ?? [])
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total, 0);
  const paid = (invoices ?? []).filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0);
  const overdueCount = (invoices ?? []).filter((i) => i.status === "overdue").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hi {user?.name?.split(" ")[0]} 👋</h1>
            <p className="text-muted-foreground">Here's how your invoices are doing.</p>
          </div>
          <Button asChild>
            <Link href="/invoices/new">
              <Plus /> New invoice
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{formatMoney(outstanding)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-600">{formatMoney(paid)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue invoices</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-red-600">{overdueCount}</CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !invoices?.length ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10" />
                <p>No invoices yet. Create your first one to get paid.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline">
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right">{formatMoney(invoice.total, invoice.currency)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
