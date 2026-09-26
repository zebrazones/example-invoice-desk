import { Link, useLocation } from "wouter";
import { FileText, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Invoices" },
    { href: "/invoices/new", label: "New invoice" },
    // Only show the admin link to admins
    ...(user?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText className="h-4 w-4" />
            </div>
            InvoiceDesk
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  location === item.href && "bg-muted text-foreground",
                )}
              >
                {item.href === "/admin" && <Shield className="mr-1 inline h-3.5 w-3.5" />}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right text-sm sm:block">
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.businessName || user?.username}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => logoutMutation.mutate()} title="Log out">
            <LogOut />
          </Button>
        </div>
      </div>
    </header>
  );
}
