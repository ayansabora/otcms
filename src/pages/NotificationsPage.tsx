import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "../api/notifications";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Card } from "../components/Card";
import { PageLoading } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", { page, unreadOnly }],
    queryFn: () => notificationsApi.list({ page, pageSize: 20, unreadOnly }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = data?.items.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Notifications"
        subtitle={data ? `${unreadCount} unread` : undefined}
        actions={
          unreadCount > 0 ? (
            <Button variant="secondary" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-4">
        <Button variant={unreadOnly ? "secondary" : "primary"} onClick={() => { setUnreadOnly(false); setPage(1); }}>All</Button>
        <Button variant={unreadOnly ? "primary" : "secondary"} onClick={() => { setUnreadOnly(true); setPage(1); }}>Unread</Button>
      </div>

      {isLoading && <PageLoading />}
      {!isLoading && data?.items.length === 0 && <EmptyState icon="🔔" title="No notifications" />}
      {!isLoading && data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((n) => (
            <Card key={n.id} className={`p-4 ${n.readAt ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{n.title}</p>
                  {n.body && <p className="text-sm text-[var(--color-muted)] mt-1">{n.body}</p>}
                  <p className="text-xs text-[var(--color-muted)] mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.readAt && <div className="w-2 h-2 rounded-full bg-[var(--color-forest)] mt-1.5 shrink-0" />}
              </div>
            </Card>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-between mt-4">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</Button>
          <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
