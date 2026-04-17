import React from 'react';
import { Routes, Route } from 'react-router-dom';
import SuperAdminDashboard from '../../../../components/SuperAdminDashboard';
import SuperAdminUsers from './users';
import SuperAdminCourses from './courses';
import SuperAdminAnalytics from './analytics';
import SuperAdminFinance from './finance';
import SuperAdminSettings from './settings';
import SuperAdminAudit from './audit';

const SuperAdminRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<SuperAdminDashboard />} />
      <Route path="/users" element={<SuperAdminUsers />} />
      <Route path="/courses" element={<SuperAdminCourses />} />
      <Route path="/analytics" element={<SuperAdminAnalytics />} />
      <Route path="/finance" element={<SuperAdminFinance />} />
      <Route path="/settings" element={<SuperAdminSettings />} />
      <Route path="/audit" element={<SuperAdminAudit />} />
    </Routes>
  );
};

export default SuperAdminRoutes;