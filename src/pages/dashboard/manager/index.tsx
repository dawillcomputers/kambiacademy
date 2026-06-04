import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell, { SidebarItem } from '../../../../components/layout/DashboardShell';
import ManagerOverview from './overview';
import ManagerManageBootcamp from './manage';

const sidebarItems: SidebarItem[] = [
  { name: 'My Bootcamps', icon: '🚀', path: '/manager' },
  { name: 'View website', icon: '🌐', path: '/' },
];

const ManagerRoutes: React.FC = () => (
  <DashboardShell sidebarItems={sidebarItems} title="KAMBI" subtitle="Bootcamp Manager" variant="superadmin">
    <Routes>
      <Route path="/" element={<ManagerOverview />} />
      <Route path="/:id" element={<ManagerManageBootcamp />} />
      <Route path="*" element={<Navigate to="/manager" replace />} />
    </Routes>
  </DashboardShell>
);

export default ManagerRoutes;
