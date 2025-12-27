import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import States from "./pages/Masters/States";
import Cities from "./pages/Masters/Cities";
import Skills from "./pages/Masters/Skills";
import Qualifications from "./pages/Masters/Qualifications";
import Shifts from "./pages/Masters/Shifts";
import JobProfiles from "./pages/Masters/JobProfiles";
import DocumentTypes from "./pages/Masters/DocumentTypes";
import WorkNatures from "./pages/Masters/WorkNatures";
import SalaryRanges from "./pages/Masters/SalaryRanges";
import BusinessCategories from "./pages/Masters/BusinessCategories";
import Experiences from "./pages/Masters/Experiences";
import SalaryTypes from "./pages/Masters/SalaryTypes";
import Distances from "./pages/Masters/Distances";
import EmployeeCallExperience from "./pages/Masters/EmployeeCallExperience";
import EmployeeReportReasons from "./pages/Masters/EmployeeReportReasons";
import VacancyNumbers from "./pages/Masters/VacancyNumbers";
import JobBenefits from "./pages/Masters/JobBenefits";
import EmployerCallExperience from "./pages/Masters/EmployerCallExperience";
import EmployerReportReasons from "./pages/Masters/EmployerReportReasons";
import EmployeeSubscriptionPlans from "./pages/Subscriptions/EmployeeSubscriptionPlans";
import EmployerSubscriptionPlans from "./pages/Subscriptions/EmployerSubscriptionPlans";
import PlanBenefits from "./pages/Subscriptions/PlanBenefits";
import UsersManagement from "./pages/Users/UsersManagement";
import EmployeesManagement from "./pages/Employees/EmployeesManagement";
import EmployeeDetail from "./pages/Employees/EmployeeDetail";
import EmployersManagement from "./pages/Employers/EmployersManagement";
import EmployerDetail from "./pages/Employers/EmployerDetail";
import StoriesManagement from "./pages/Stories/StoriesManagement";
import CallHistoryManagement from "./pages/CallHistory/CallHistoryManagement";
import PaymentHistoryManagement from "./pages/PaymentHistory/PaymentHistoryManagement";
import ViolationReportsManagement from "./pages/ViolationReports/ViolationReportsManagement";
import JobsManagement from "./pages/Jobs/JobsManagement";
import JobDetail from "./pages/Jobs/JobDetail";
import AdminsManagement from "./pages/Admins/AdminsManagement";
import RolesManagement from "./pages/Admins/RolesManagement";
import HiredEmployees from "./pages/Hired/HiredEmployees";
import PendingDeletionUsers from "./pages/Users/PendingDeletionUsers";
import DeletedUsers from "./pages/Users/DeletedUsers";
import NotificationsManagement from "./pages/Notifications/NotificationsManagement";
import EmployeeReferrals from "./pages/Referrals/EmployeeReferrals";
import EmployerReferrals from "./pages/Referrals/EmployerReferrals";
import SettingsPage from "./pages/Settings";
import LogsPage from "./pages/Logs/LogsPage";
import ReviewsManagement from "./pages/Reviews/ReviewsManagement";
import ReferralCredits from "./pages/Masters/ReferralCredits";
import Volunteers from "./pages/Masters/Volunteers";
import InvoiceViewer from "./pages/InvoiceViewer";

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isTokenExpired = (token) => {
  if (!token) return true;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return Date.now() >= payload.exp * 1000;
};

const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const admin = localStorage.getItem('admin');
  if (!token || !admin) return false;

  if (isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    return false;
  }

  return true;
};

function RequireAuth() {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function PublicOnly({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function IndexRedirect() {
  return isAuthenticated() ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />

      <Route path="/" element={<IndexRedirect />} />

      <Route element={<RequireAuth />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/masters/states" element={<States />} />
        <Route path="/masters/cities" element={<Cities />} />
        <Route path="/masters/skills" element={<Skills />} />
        <Route path="/masters/qualifications" element={<Qualifications />} />
        <Route path="/masters/shifts" element={<Shifts />} />
        <Route path="/masters/job-profiles" element={<JobProfiles />} />
        <Route path="/masters/document-types" element={<DocumentTypes />} />
        <Route path="/masters/work-natures" element={<WorkNatures />} />
        <Route path="/masters/business-categories" element={<BusinessCategories />} />
        <Route path="/masters/experiences" element={<Experiences />} />
        <Route path="/masters/salary-types" element={<SalaryTypes />} />
        <Route path="/masters/salary-ranges" element={<SalaryRanges />} />
        <Route path="/masters/distances" element={<Distances />} />
        <Route path="/masters/employee-call-experience" element={<EmployeeCallExperience />} />
        <Route path="/masters/employee-report-reasons" element={<EmployeeReportReasons />} />
        <Route path="/masters/vacancy-numbers" element={<VacancyNumbers />} />
        <Route path="/masters/job-benefits" element={<JobBenefits />} />
        <Route path="/masters/employer-call-experience" element={<EmployerCallExperience />} />
        <Route path="/masters/employer-report-reasons" element={<EmployerReportReasons />} />
        <Route path="/subscriptions/employee" element={<EmployeeSubscriptionPlans />} />
        <Route path="/subscriptions/employer" element={<EmployerSubscriptionPlans />} />
        <Route path="/subscriptions/plan-benefits" element={<PlanBenefits />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/users/deletion-requests" element={<PendingDeletionUsers />} />
        <Route path="/users/deleted" element={<DeletedUsers />} />
        <Route path="/employees" element={<EmployeesManagement />} />
        <Route path="/employees/:id" element={<EmployeeDetail />} />
        <Route path="/employers" element={<EmployersManagement />} />
        <Route path="/employers/:id" element={<EmployerDetail />} />
        <Route path="/stories" element={<StoriesManagement />} />
        <Route path="/call-history" element={<CallHistoryManagement />} />
        <Route path="/payment-history" element={<PaymentHistoryManagement />} />
        <Route path="/violation-reports" element={<ViolationReportsManagement />} />
        <Route path="/jobs" element={<JobsManagement />} />
        <Route path="/jobs/:jobId" element={<JobDetail />} />
        <Route path="/admins" element={<AdminsManagement />} />
        <Route path="/roles" element={<RolesManagement />} />
        <Route path="/hired-employees" element={<HiredEmployees />} />
        <Route path="/notifications" element={<NotificationsManagement />} />
        <Route path="/reviews" element={<ReviewsManagement />} />
        <Route path="/referrals/employees" element={<EmployeeReferrals />} />
        <Route path="/referrals/employers" element={<EmployerReferrals />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/masters/referral-credits" element={<ReferralCredits />} />
        <Route path="/masters/volunteers" element={<Volunteers />} />
        <Route path="/invoice/:invoiceNumber" element={<InvoiceViewer />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
