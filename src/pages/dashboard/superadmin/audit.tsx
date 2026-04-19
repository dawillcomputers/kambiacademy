import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';

interface AuditEntry {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  old_role: string;
  new_role: string;
  changed_by: number;
  changed_by_name: string;
  reason?: string;
  created_at: string;
}

const SuperAdminAudit: React.FC = () => {
  const [log, setLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLog = async () => {
      try {
        const response = await api.getAuditLog();
        setLog(response.log || []);
      } catch (error) {
        console.error('Failed to load audit log:', error);
      } finally {
        setLoading(false);
      }
    };
    void loadLog();
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'student': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">Track role changes and administrative actions</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          </div>
        ) : log.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            No audit log entries found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Change</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Changed By</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {log.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-semibold text-slate-900">{entry.user_name}</p>
                      <p className="text-xs text-slate-500">{entry.user_email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getRoleColor(entry.old_role)}`}>
                          {entry.old_role?.replace('_', ' ') || '—'}
                        </span>
                        <span className="text-slate-400">→</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${getRoleColor(entry.new_role)}`}>
                          {entry.new_role?.replace('_', ' ') || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {entry.changed_by_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                      {entry.reason || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(entry.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminAudit;