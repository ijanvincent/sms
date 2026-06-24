import { Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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
import { listMessages } from "@/server/services/message-service";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const messages = await listMessages();

  return (
    <PageContainer>
      <PageHeader
        title="Messages"
        description="The message queue, newest first. Showing the latest 100."
      />

      <Card>
        <CardContent>
          {messages.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No messages yet"
              description="Messages clients post to the API will be queued here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell className="font-mono text-xs tabular-nums">
                      {message.recipient}
                    </TableCell>
                    <TableCell
                      className="max-w-sm truncate text-muted-foreground"
                      title={message.body}
                    >
                      {message.body}
                    </TableCell>
                    <TableCell>
                      {isMessageStatus(message.status) && (
                        <StatusBadge status={message.status} />
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {message.attempts}/{message.maxAttempts}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {message.device?.name ?? "—"}
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
