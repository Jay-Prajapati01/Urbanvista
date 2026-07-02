import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import { useAuth } from "@/lib/auth";
import { authApi, housesApi } from "@/lib/api";
import type { House } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Shield, UserCircle2, Home, LockKeyhole, Loader2 } from "lucide-react";

type EffectiveScope = {
  role: string;
  houseIds: string[];
  blocks: string[];
  scopeVersion: number;
};

export default function SecretarySettings() {
  const { user, isAuthenticated, isDemo } = useAuth();
  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["secretary-me"],
    queryFn: authApi.me,
    enabled: hasToken,
  });

  const { data: scope, isLoading: scopeLoading } = useQuery<EffectiveScope>({
    queryKey: ["secretary-settings-effective-scope"],
    queryFn: authApi.effectiveScope,
    enabled: hasToken,
  });

  const { data: houses = [], isLoading: housesLoading } = useQuery<House[]>({
    queryKey: ["secretary-settings-houses"],
    queryFn: housesApi.getAll,
    enabled: hasToken,
  });

  if (meLoading || scopeLoading || housesLoading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading secretary settings...</span>
        </div>
      </SecretaryLayout>
    );
  }

  const principal = meData?.user || user;

  return (
    <SecretaryLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground">Secretary Settings</h1>
          <p className="text-muted-foreground mt-1">
            Review your account details and assignment scope.
          </p>
        </div>

        <div className="glass-card p-6 animate-fade-up delay-100">
          <div className="flex items-center gap-3 mb-5">
            <UserCircle2 className="w-5 h-5 text-steel-blue" />
            <h2 className="text-lg font-semibold text-foreground">Account</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Name</div>
              <div className="font-medium text-foreground mt-1">{principal?.name}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Email</div>
              <div className="font-medium text-foreground mt-1">{principal?.email}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Username</div>
              <div className="font-medium text-foreground mt-1">{principal?.username || "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Role</div>
              <div className="mt-1">
                <Badge className="bg-steel-blue/10 text-steel-blue border-steel-blue/20">
                  <Shield className="w-3 h-3 mr-1" />
                  Secretary
                </Badge>
              </div>
            </div>
          </div>

          {Boolean(principal?.mustResetPassword) && (
            <div className="mt-5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
              You are currently using a temporary password. Please ask admin to enable password change flow if not already configured.
            </div>
          )}
        </div>

        <div className="glass-card p-6 animate-fade-up delay-200">
          <div className="flex items-center gap-3 mb-5">
            <Home className="w-5 h-5 text-steel-blue" />
            <h2 className="text-lg font-semibold text-foreground">Assignment Scope</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-5">
            <div className="rounded-lg bg-secondary/40 p-4">
              <div className="text-xs text-muted-foreground uppercase">Assigned Blocks</div>
              <div className="text-xl font-bold text-foreground mt-1">{scope?.blocks?.length || 0}</div>
            </div>
            <div className="rounded-lg bg-secondary/40 p-4">
              <div className="text-xs text-muted-foreground uppercase">Accessible Flats</div>
              <div className="text-xl font-bold text-foreground mt-1">{scope?.houseIds?.length || 0}</div>
            </div>
            <div className="rounded-lg bg-secondary/40 p-4">
              <div className="text-xs text-muted-foreground uppercase">Loaded Houses</div>
              <div className="text-xl font-bold text-foreground mt-1">{houses.length}</div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-2">Assigned Blocks</div>
          <div className="flex flex-wrap gap-2 mb-5">
            {scope?.blocks?.length ? (
              scope.blocks.map((block) => (
                <Badge key={block} variant="outline" className="border-border text-foreground">
                  {block}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No blocks assigned.</span>
            )}
          </div>

          <div className="text-sm text-muted-foreground mb-2">Accessible Flat List</div>
          <div className="max-h-56 overflow-auto rounded-lg border border-border">
            {houses.length ? (
              <div className="divide-y divide-border">
                {houses.map((h) => (
                  <div key={h.id} className="px-3 py-2 text-sm flex items-center justify-between">
                    <span className="text-foreground">{h.block} - {h.houseNumber}</span>
                    <span className="text-muted-foreground">{h.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-3 py-3 text-sm text-muted-foreground">No houses in current scope.</div>
            )}
          </div>
        </div>

        <div className="glass-card p-6 animate-fade-up delay-300">
          <div className="flex items-center gap-3 mb-2">
            <LockKeyhole className="w-5 h-5 text-steel-blue" />
            <h2 className="text-lg font-semibold text-foreground">Security Notes</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Session and assignment controls are enforced on backend. If you cannot access a record, it is likely outside your active assignment scope.
          </p>
        </div>
      </div>
    </SecretaryLayout>
  );
}
