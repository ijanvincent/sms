import { KeyRound } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateKeyForm } from "@/components/keys/create-key-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StateBadge } from "@/components/ui/state-badge";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { formatDateTime } from "@/lib/format";
import { listApiKeys } from "@/server/services/api-key-service";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const keys = await listApiKeys();

  return (
    <PageContainer>
      <PageHeader
        title="API Keys"
        description="Credentials authorized to enqueue messages. Only the key prefix is shown — the secret is never stored in clear text."
      />

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Issue a key</CardTitle>
          <CardDescription>
            The secret is shown once, at creation, and never again.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateKeyForm />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {keys.length === 0 ? (
            <EmptyState
              icon={KeyRound}
              title="No API keys"
              description="Issue one above to let a client or the sender app authenticate."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Daily quota</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Last used</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.label}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {key.prefix}…
                    </TableCell>
                    <TableCell>
                      <StateBadge
                        tone={key.scope === "gateway" ? "info" : "neutral"}
                        label={key.scope}
                        className="capitalize"
                      />
                    </TableCell>
                    <TableCell>
                      <StateBadge
                        tone={key.enabled ? "positive" : "neutral"}
                        label={key.enabled ? "Enabled" : "Disabled"}
                      />
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {key.dailyQuota ?? "∞"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {key.messageCount}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(key.lastUsedAt)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(key.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
