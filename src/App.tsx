import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthContext";
import { ToastProvider } from "./components/Toast";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";

// Auth
import { LoginPage } from "./pages/LoginPage";

// Dashboard
import { DashboardPage } from "./pages/DashboardPage";

// Cases
import { CasesListPage } from "./pages/cases/CasesListPage";
import { CaseDetailPage } from "./pages/cases/CaseDetailPage";
import { NewCasePage } from "./pages/cases/NewCasePage";

// Community Members
import { MembersListPage } from "./pages/members/MembersListPage";
import { MemberDetailPage } from "./pages/members/MemberDetailPage";
import { NewMemberPage } from "./pages/members/NewMemberPage";

// Hearings
import { HearingsListPage } from "./pages/hearings/HearingsListPage";
import { ScheduleHearingPage } from "./pages/hearings/ScheduleHearingPage";
import { HearingDetailPage } from "./pages/hearings/HearingDetailPage";

// Decisions
import { DecisionsListPage } from "./pages/decisions/DecisionsListPage";
import { DecisionDetailPage } from "./pages/decisions/DecisionDetailPage";
import { RecordDecisionPage } from "./pages/decisions/RecordDecisionPage";

// Documents
import { DocumentsListPage } from "./pages/documents/DocumentsListPage";

// Notifications
import { NotificationsPage } from "./pages/notifications/NotificationsPage";

// Settings
import { SettingsPage } from "./pages/settings/SettingsPage";

// Reports
import { ReportsPage } from "./pages/reports/ReportsPage";

// Users (Admin)
import { UsersListPage } from "./pages/users/UsersListPage";

// Audit Log
import { AuditLogPage } from "./pages/audit/AuditLogPage";

// Actors & Roles
import { ActorsRolesPage } from "./pages/roles/ActorsRolesPage";

// Role Management (Admin)
import { RoleManagementPage } from "./pages/admin/RoleManagementPage";

// Roles & Permissions (Admin)
import { PermissionsPage } from "./pages/admin/PermissionsPage";

// Community Member pages
import { MyCasesPage } from "./pages/my-cases/MyCasesPage";
import { SubmitCaseRequestPage } from "./pages/case-request/SubmitCaseRequestPage";

// Record Officer management sub-pages
import { PlaintiffsPage } from "./pages/parties/PlaintiffsPage";
import { DefendantsPage } from "./pages/parties/DefendantsPage";
import { WitnessesPage } from "./pages/parties/WitnessesPage";

// Case Requests (Record Officer queue)
import { CaseRequestsPage } from "./pages/case-requests/CaseRequestsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard */}
              <Route index element={<DashboardPage />} />

              {/* Cases */}
              <Route path="cases" element={<CasesListPage />} />
              <Route path="cases/new" element={<NewCasePage />} />
              <Route path="cases/:id" element={<CaseDetailPage />} />

              {/* Community Members */}
              <Route path="members" element={<MembersListPage />} />
              <Route path="members/new" element={<NewMemberPage />} />
              <Route path="members/:id" element={<MemberDetailPage />} />

              {/* Hearings */}
              <Route path="hearings" element={<HearingsListPage />} />
              <Route path="hearings/schedule" element={<ScheduleHearingPage />} />
              <Route path="hearings/:id" element={<HearingDetailPage />} />

              {/* Decisions */}
              <Route path="decisions" element={<DecisionsListPage />} />
              <Route path="decisions/record" element={<RecordDecisionPage />} />
              <Route path="decisions/:id" element={<DecisionDetailPage />} />

              {/* Documents */}
              <Route path="documents" element={<DocumentsListPage />} />

              {/* Notifications */}
              <Route path="notifications" element={<NotificationsPage />} />

              {/* Settings */}
              <Route path="settings" element={<SettingsPage />} />
              <Route path="settings/password" element={<SettingsPage />} />

              {/* Reports */}
              <Route path="reports" element={<ReportsPage />} />

              {/* Users Administration */}
              <Route path="users" element={<UsersListPage />} />

              {/* Role Management (Admin) */}
              <Route path="role-management" element={<RoleManagementPage />} />

              {/* Audit Log */}
              <Route path="audit-logs" element={<AuditLogPage />} />

              {/* Actors & Roles */}
              <Route path="roles" element={<ActorsRolesPage />} />

              {/* Roles & Permissions (Admin) */}
              <Route path="permissions" element={<PermissionsPage />} />

              {/* Community Member pages */}
              <Route path="my-cases" element={<MyCasesPage />} />
              <Route path="case-request" element={<SubmitCaseRequestPage />} />

              {/* Record Officer party management */}
              <Route path="plaintiffs" element={<PlaintiffsPage />} />
              <Route path="defendants" element={<DefendantsPage />} />
              <Route path="witnesses" element={<WitnessesPage />} />

              {/* Record Officer case request queue */}
              <Route path="case-requests" element={<CaseRequestsPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
