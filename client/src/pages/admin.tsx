import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import type { PublicUser } from "@shared/schema";
import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";

type AdminStats = {
  totalUsers: number;
  totalInvoices: number;
  totalInvoiced: number;
  totalPaid: number;
};

type AdminUser = PublicUser & { invoiceCount: number; invoicedTotal: number };

export default function AdminPage() {
  const { data: stats } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });
  const { data: users, isLoading } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"] });

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold">Admin</h1>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Users", value: stats?.totalUsers ?? "–" },
            { label: "Invoices", value: stats?.totalInvoices ?? "–" },
            { label: "Invoiced", value: stats ? formatMoney(stats.totalInvoiced) : "–" },
            { label: "Paid", value: stats ? formatMoney(stats.totalPaid) : "–" },
          ].map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold">{item.value}</CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.username}</TableCell>
                      <TableCell>{u.businessName || "–"}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                      </TableCell>
                      <TableCell>{format(new Date(u.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">{u.invoiceCount}</TableCell>
                      <TableCell className="text-right">{formatMoney(u.invoicedTotal)}</TableCell>
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
