import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { User, KeyRound, Info, Shield } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { api, ApiError } from "../../api/client";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { AlertMessage } from "../../components/ErrorMessage";
import { useToast } from "../../components/Toast";
import { Tabs, TabPanel } from "../../components/Tabs";

const TABS = [
  { id: "profile",  label: "Profile",   icon: <User size={15} /> },
  { id: "password", label: "Password",  icon: <KeyRound size={15} /> },
  { id: "system",   label: "System",    icon: <Info size={15} /> },
];

export function SettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("profile");

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError]                 = useState<string | null>(null);

  const changePwMutation = useMutation({
    mutationFn: () =>
      api.post<void>("/auth/change-password", { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success("Password changed successfully.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setPwError(null);
    },
    onError: (err) =>
      setPwError(err instanceof ApiError ? err.message : "Failed to change password."),
  });

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 12) { setPwError("New password must be at least 12 characters."); return; }
    if (newPassword !== confirmPassword) { setPwError("Passwords do not match."); return; }
    changePwMutation.mutate();
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" subtitle="Manage your account and preferences." />

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} className="mb-6" />

      {/* Profile Tab */}
      <TabPanel id="profile" active={activeTab}>
        <Card>
          <CardHeader title="Profile Information" icon={<User />} />
          <CardBody className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-2xl font-bold shrink-0">
                {user?.fullName?.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() ?? "U"}
              </div>
              <div>
                <p className="font-semibold text-[var(--color-ink)]">{user?.fullName}</p>
                <p className="text-sm text-[var(--color-muted)]">{user?.email}</p>
                <p className="text-xs text-[var(--color-primary)] font-medium mt-1">
                  {user?.roles.join(", ")}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--color-line)] pt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1">Full Name</p>
                <p className="text-[var(--color-ink)]">{user?.fullName || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1">Email</p>
                <p className="text-[var(--color-ink)]">{user?.email || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1">Roles</p>
                <p className="text-[var(--color-ink)]">{user?.roles.join(", ") || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1">Permissions</p>
                <p className="text-[var(--color-ink)]">{user?.permissions.length ?? 0} granted</p>
              </div>
            </div>

            <AlertMessage
              variant="info"
              message="To update your profile details, contact a system administrator."
            />
          </CardBody>
        </Card>
      </TabPanel>

      {/* Password Tab */}
      <TabPanel id="password" active={activeTab}>
        <Card>
          <CardHeader title="Change Password" icon={<KeyRound />} subtitle="Use a strong password of at least 12 characters." />
          <CardBody>
            <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-sm">
              <Input
                label="Current Password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <Input
                label="New Password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                hint="At least 12 characters with letters and numbers."
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {pwError && <AlertMessage variant="danger" message={pwError} />}
              <Button
                type="submit"
                loading={changePwMutation.isPending}
                leftIcon={<Shield size={15} />}
              >
                Change Password
              </Button>
            </form>
          </CardBody>
        </Card>
      </TabPanel>

      {/* System Info Tab */}
      <TabPanel id="system" active={activeTab}>
        <Card>
          <CardHeader title="System Information" icon={<Info />} />
          <CardBody>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Application",  value: "OTCMS" },
                { label: "Version",      value: "1.0.0" },
                { label: "Organization", value: "Bale Robe City" },
                { label: "Court Type",   value: "Oromo Traditional Court" },
                { label: "Database",     value: "MySQL 8.0 (Prisma)" },
                { label: "Environment",  value: import.meta.env.MODE ?? "development" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-[var(--color-ink)] font-medium">{value}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </TabPanel>
    </div>
  );
}
