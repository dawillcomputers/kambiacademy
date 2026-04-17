import React from 'react'; import { Link } from 'react-router-dom';
const SuperAdminSettings: React.FC = () => {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <aside className="w-72 h-screen overflow-y-auto border-r border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="p-6 border-b border-white/10"><h1 className="text-xl font-bold text-white">Super Admin</h1><p className="text-sm text-slate-400 mt-1">Kambi Academy</p></div>
        <nav className="p-4 space-y-2">
          {[
            { name: 'Dashboard', icon: '📊', path: '/superadmin', active: false },
            { name: 'Users', icon: '👥', path: '/superadmin/users', active: false },
            { name: 'Courses', icon: '📚', path: '/superadmin/courses', active: false },
            { name: 'Analytics', icon: '📈', path: '/superadmin/analytics', active: false },
            { name: 'Finance', icon: '💰', path: '/superadmin/finance', active: false },
            { name: 'Settings', icon: '⚙️', path: '/superadmin/settings', active: true },
            { name: 'Audit Log', icon: '📋', path: '/superadmin/audit', active: false },
          ].map((item) => (
            <Link key={item.name} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${item.active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-lg">{item.icon}</span><span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col min-h-0">
        <header className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/30 backdrop-blur-sm">
          <div><h1 className="text-2xl font-bold text-white">Settings</h1><p className="text-slate-400 mt-1">Platform configuration and settings</p></div>
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-white/10 p-8 text-center">
            <div className="text-6xl mb-4">⚙️</div><h2 className="text-xl font-semibold text-white mb-2">Platform Settings</h2><p className="text-slate-400">System configuration features coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
};
export default SuperAdminSettings;