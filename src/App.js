import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import UsersManagement from "./pages/Users/UsersManagement"; // renamed from List.js
import EmployeesManagement from "./pages/Employees/EmployeesManagement";
import EmployeeDetail from './pages/Employees/EmployeeDetail'; // added
import EmployersManagement from './pages/Employers/EmployersManagement'; // added
import EmployerDetail from './pages/Employers/EmployerDetail'; // added
import StoriesManagement from './pages/Stories/StoriesManagement'; // added
import CallHistoryManagement from './pages/CallHistory/CallHistoryManagement'; // added
import PaymentHistoryManagement from './pages/PaymentHistory/PaymentHistoryManagement'; // added
import ViolationReportsManagement from './pages/ViolationReports/ViolationReportsManagement'; // added
import JobsManagement from './pages/Jobs/JobsManagement'; // added
import JobDetail from './pages/Jobs/JobDetail'; // add this import
import AdminsManagement from './pages/Admins/AdminsManagement'; // added
import RolesManagement from './pages/Admins/RolesManagement'; // added
import HiredEmployees from './pages/Hired/HiredEmployees'; // added
import PendingDeletionUsers from "./pages/Users/PendingDeletionUsers"; // added
import DeletedUsers from './pages/Users/DeletedUsers'; // added
import NotificationsManagement from './pages/Notifications/NotificationsManagement'; // added
import EmployeeReferrals from './pages/Referrals/EmployeeReferrals';
import EmployerReferrals from './pages/Referrals/EmployerReferrals';
import SettingsPage from './pages/Settings'; // added import
import ReviewsManagement from './pages/Reviews/ReviewsManagement'; // added import

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
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
          <Route path="/employees/:id" element={<EmployeeDetail />} /> {/* added */}
          <Route path="/employers" element={<EmployersManagement />} /> {/* added */}
          <Route path="/employers/:id" element={<EmployerDetail />} />   {/* added */}
          <Route path="/stories" element={<StoriesManagement />} /> {/* added */}
          <Route path="/call-history" element={<CallHistoryManagement />} /> {/* added */}
          <Route path="/payment-history" element={<PaymentHistoryManagement />} /> {/* added */}
          <Route path="/violation-reports" element={<ViolationReportsManagement />} /> {/* added */}
          <Route path="/jobs" element={<JobsManagement />} /> {/* added */}
          <Route path="/jobs/:jobId" element={<JobDetail />} /> {/* add this line */}
          <Route path="/admins" element={<AdminsManagement />} /> {/* add this line */}
          <Route path="/roles" element={<RolesManagement />} /> {/* add this line */}
          <Route path="/hired-employees" element={<HiredEmployees />} /> {/* add this line */}
          <Route path="/notifications" element={<NotificationsManagement />} /> {/* add this line */}
          <Route path="/reviews" element={<ReviewsManagement />} /> {/* added route */}
          <Route path="/referrals/employees" element={<EmployeeReferrals />} />
          <Route path="/referrals/employers" element={<EmployerReferrals />} />
          <Route path="/settings" element={<SettingsPage />} /> {/* added route */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
