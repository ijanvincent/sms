import { Inbox } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { formatDateTime } from "@/lib/format";
import { isMessageStatus } from "@/lib/sms/status";
import {
  getOverviewStats,
  getRecentMessages,
} from "@/server/services/stats-service";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [stats, recent] = await Promise.all([
    getOverviewStats(),
    getRecentMessages(),
  ]);

  const cards = [
    { label: "Total messages", value: stats.messages.total },
    { label: "Sent", value: stats.messages.sent },
    { label: "Pending", value: stats.messages.pending },
    { label: "Failed", value: stats.messages.failed },
    {
      label: "Devices online",
      value: `${stats.devices.online} / ${stats.devices.total}`,
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Overview"
        description="Live status of the message queue and connected devices."
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label} size="sm">
            <CardHeader>
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="font-mono text-2xl font-semibold tabular-nums">
                {card.value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent messages</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No messages yet"
              description="Queued messages will appear here as soon as a client posts one."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {message.recipient}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {message.body}
                    </TableCell>
                    <TableCell>
                      {isMessageStatus(message.status) && (
                        <StatusBadge status={message.status} />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(message.createdAt)}
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
