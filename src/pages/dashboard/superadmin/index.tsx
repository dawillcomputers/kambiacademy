import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardShell, { SidebarItem } from '../../../../components/layout/DashboardShell';
import SuperAdminDashboard from '../../../../components/SuperAdminDashboard';
import SuperAdminUsers from './users';
import SuperAdminCourses from './courses';
import SuperAdminAnalytics from './analytics';
import SuperAdminFinance from './finance';
import SuperAdminSettings from './settings';
import SuperAdminAudit from './audit';

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', icon: '📊', path: '/superadmin' },
  { name: 'Users', icon: '👥', path: '/superadmin/users' },
  { name: 'Courses', icon: '📚', path: '/superadmin/courses' },
  { name: 'Finance', icon: '💰', path: '/superadmin/finance' },
  { name: 'Analytics', icon: '📈', path: '/superadmin/analytics' },
  { name: 'Settings', icon: '⚙️', path: '/superadmin/settings' },
  { name: 'Audit Log', icon: '📋', path: '/superadmin/audit' },
];

const SuperAdminRoutes: React.FC = () => {
  return (
    <DashboardShell
      sidebarItems={sidebarItems}
      title="KAMBI"
      subtitle="Super Admin"
      variant="superadmin"
    >
      <Routes>
        <Route path="/" element={<SuperAdminDashboard />} />
        <Route path="/users" element={<SuperAdminUsers />} />
        <Route path="/courses" element={<SuperAdminCourses />} />
        <Route path="/analytics" element={<SuperAdminAnalytics />} />
        <Route path="/finance" element={<SuperAdminFinance />} />
        <Route path="/settings" element={<SuperAdminSettings />} />
        <Route path="/audit" element={<SuperAdminAudit />} />
      </Routes>
    </DashboardShell>
  );
};

export default SuperAdminRoutes;