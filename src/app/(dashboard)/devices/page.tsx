import { Smartphone } from "lucide-react";

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
import { StateBadge } from "@/components/ui/state-badge";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { formatDateTime } from "@/lib/format";
import { isDeviceOnline } from "@/lib/sms/device";
import { listDevices } from "@/server/services/device-service";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const devices = await listDevices();

  return (
    <PageContainer>
      <PageHeader
        title="Devices"
        description="Registered sender phones and their connection status."
      />

      <Card>
        <CardContent>
          {devices.length === 0 ? (
            <EmptyState
              icon={Smartphone}
              title="No devices registered"
              description="Register a phone with the gateway app to start sending messages."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>SIM</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Last seen</TableHead>
                  <TableHead className="text-right">Registered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const online = device.enabled && isDeviceOnline(device.lastSeenAt);
                  return (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {device.carrier ?? "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                        {device.simNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        {!device.enabled ? (
                          <StateBadge tone="neutral" label="Disabled" />
                        ) : (
                          <StateBadge
                            tone={online ? "positive" : "neutral"}
                            label={online ? "Online" : "Offline"}
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {device.messageCount}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(device.lastSeenAt)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(device.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
