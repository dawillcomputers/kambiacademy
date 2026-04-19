import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';

interface TutorCourse {
  id: number;
  tutor_id: number;
  tutor_name: string;
  tutor_email: string;
  title: string;
  description: string;
  level: string;
  price: number;
  duration_label: string;
  category: string;
  status: string;
  created_at: string;
}

const SuperAdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<TutorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadCourses = async () => {
    try {
      const response = await api.adminGetCourses();
      setCourses(response.courses || []);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCourses(); }, []);

  const handleAction = async (courseId: number, status: 'approved' | 'rejected') => {
    setActionLoading(courseId);
    try {
      await api.adminManageCourse(courseId, status);
      await loadCourses();
    } catch (error) {
      console.error('Failed to update course:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (courseId: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    setActionLoading(courseId);
    try {
      await api.adminDeleteCourse(courseId);
      await loadCourses();
    } catch (error) {
      console.error('Failed to delete course:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCourses = courses.filter(c => filter === 'all' || c.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Course Management</h1>
        <p className="mt-1 text-sm text-slate-500">Review and manage all tutor-submitted courses</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All Courses', count: courses.length },
          { key: 'pending', label: 'Pending Review', count: courses.filter(c => c.status === 'pending').length },
          { key: 'approved', label: 'Approved', count: courses.filter(c => c.status === 'approved').length },
          { key: 'rejected', label: 'Rejected', count: courses.filter(c => c.status === 'rejected').length },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key as any)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === item.key
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label} ({item.count})
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tutor</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Level</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{course.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{course.description}</p>
                        <p className="text-xs text-slate-400 mt-1">{course.category} · {course.duration_label}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-slate-900">{course.tutor_name}</p>
                      <p className="text-xs text-slate-500">{course.tutor_email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-700">{course.level}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-slate-900">
                        {course.price > 0 ? `$${course.price}` : 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusColor(course.status)}`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {course.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAction(course.id, 'approved')}
                              disabled={actionLoading === course.id}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(course.id, 'rejected')}
                              disabled={actionLoading === course.id}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(course.id)}
                          disabled={actionLoading === course.id}
                          className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCourses.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-500">No courses found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminCourses;