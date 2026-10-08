import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { notificationsApi } from "../../api/notifications";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Card } from "../../components/Card";
import { SkeletonCard } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", { page, unreadOnly }],
    queryFn: () => notificationsApi.list({ page, pageSize: 20, unreadOnly }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read.");
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = data?.items.filter((n) => !n.readAt).length ?? 0;

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins < 1)   return "Just now";
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="secondary"
              leftIcon={<CheckCheck size={15} />}
              onClick={() => markAllMutation.mutate()}
              loading={markAllMutation.isPending}
            >
              Mark All Read
            </Button>
          ) : undefined
        }
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        <Button
          size="sm"
          variant={!unreadOnly ? "primary" : "secondary"}
          onClick={() => { setUnreadOnly(false); setPage(1); }}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={unreadOnly ? "primary" : "secondary"}
          onClick={() => { setUnreadOnly(true); setPage(1); }}
        >
          Unread
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!isLoading && data?.items.length === 0 && (
        <EmptyState
          icon={<Bell />}
          title="No notifications"
          description={unreadOnly ? "You have no unread notifications." : "Notifications will appear here when events occur."}
          culturalPattern
        />
      )}

      {!isLoading && data && data.items.length > 0 && (
        <div className="space-y-2">
          {data.items.map((n) => (
            <Card
              key={n.id}
              hover
              className={`transition-all ${n.readAt ? "opacity-70" : "border-l-4 border-l-[var(--color-primary)]"}`}
            >
              <div className="flex items-start gap-4 px-5 py-4">
                {/* Unread dot */}
                <div className="shrink-0 mt-1">
                  {!n.readAt
                    ? <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
                    : <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.readAt ? "text-[var(--color-muted)]" : "font-semibold text-[var(--color-ink)]"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{n.body}</p>
                  )}
                  <p className="text-xs text-[var(--color-faint)] mt-2">{timeAgo(n.createdAt)}</p>
                </div>

                {!n.readAt && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markOneMutation.mutate(n.id)}
                    className="shrink-0 text-xs"
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex justify-between mt-5">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</Button>
          <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}
