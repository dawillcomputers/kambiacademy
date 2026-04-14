
import React, { useState, useMemo } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { User, Course, Enrollment, CourseStatus, AppSettings, Report, Message, Submission, View, Expense, Testimonial } from '../../types';
import Card from '../Card';
import Button from '../Button';
import Modal from '../Modal';
import { BankIcon, IdentificationIcon } from '../icons/Icons';
import DocumentViewerModal from '../DocumentViewerModal';

const StatCard: React.FC<{ title: string; value: string | number, subtext?: string }> = ({ title, value, subtext }) => (
    <Card className="p-6">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-indigo-600">{value}</p>
        {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
    </Card>
);

const StatusBadge: React.FC<{ status: CourseStatus | User['status'] | User['kycStatus'] }> = ({ status }) => {
    const styles: Record<string, string> = {
        [CourseStatus.Approved]: 'bg-green-100 text-green-800',
        [CourseStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [CourseStatus.Rejected]: 'bg-red-100 text-red-800',
        'active': 'bg-blue-100 text-blue-800',
        'suspended': 'bg-orange-100 text-orange-800',
        'verified': 'bg-green-100 text-green-800',
        'pending': 'bg-yellow-100 text-yellow-800',
        'rejected': 'bg-red-100 text-red-800',
        'unverified': 'bg-slate-100 text-slate-800',
    };
    return <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full capitalize ${styles[status!]}`}>{status}</span>
}

interface AdminDashboardProps {
    users: User[];
    courses: Course[];
    enrollments: Enrollment[];
    reports: Report[];
    messages: Message[];
    submissions: Submission[];
    expenses: Expense[];
    platformPayouts: number;
    onUpdateCourse: (course: Course) => void;
    settings: AppSettings;
    onUpdateSettings: (settings: Partial<AppSettings>) => void;
    onUpdateUser: (user: User) => void;
    onNavigate: (view: View) => void;
    onLogExpense: (description: string, amount: number) => void;
    onAdminWithdrawal: (amount: number) => void;
    onBack: () => void;
    canGoBack: boolean;
    // New testimonial props
    testimonials: Testimonial[];
    onAddTestimonial: (testimonial: Omit<Testimonial, 'id'>) => void;
    onDeleteTestimonial: (id: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    users, courses, enrollments, reports, messages, submissions, expenses, platformPayouts, 
    onUpdateCourse, settings, onUpdateSettings, onUpdateUser, onNavigate, onLogExpense, 
    onAdminWithdrawal, onBack, canGoBack, testimonials, onAddTestimonial, onDeleteTestimonial 
}) => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [userTab, setUserTab] = useState<'teachers' | 'students'>('teachers');
  const [guaranteeDays, setGuaranteeDays] = useState(settings.moneyBackGuaranteeDays);
  const [investigationTarget, setInvestigationTarget] = useState<User | null>(null);
  const [kycVerificationTarget, setKycVerificationTarget] = useState<User | null>(null);
  const [documentToView, setDocumentToView] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Testimonial Form State
  const [newTestimonial, setNewTestimonial] = useState({ name: '', course: '', quote: '', avatar: '' });

  const adminUser = users.find(u => u.role === 'admin')!;
  const [profile, setProfile] = useState({ 
      name: adminUser.name, 
      bvn: adminUser.bvn || '',
      nin: adminUser.nin || '',
      bankName: adminUser.bankName || '',
      accountNumber: adminUser.accountNumber || '',
      accountName: adminUser.accountName || '',
  });

  const teachers = users.filter(u => u.role === 'teacher');
  const students = users.filter(u => u.role === 'student');

  const financials = useMemo(() => {
    const totalRevenue = enrollments.reduce((sum, e) => sum + e.amountPaid, 0);
    const platformProfit = enrollments.reduce((sum, e) => sum + e.platformFee, 0);
    const totalTeacherPayouts = teachers.reduce((sum, t) => sum + (t.earnings?.paidOut ?? 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = platformProfit - totalExpenses;
    const availableForWithdrawal = netProfit - platformPayouts;

    return { totalRevenue, platformProfit, totalTeacherPayouts, totalExpenses, netProfit, platformPayouts, availableForWithdrawal };
  }, [enrollments, teachers, expenses, platformPayouts]);

  const topCourses = useMemo(() => {
    const courseEnrollments: Record<string, number> = {};
    enrollments.forEach(e => {
        courseEnrollments[e.courseId] = (courseEnrollments[e.courseId] || 0) + 1;
    });
    return Object.entries(courseEnrollments)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 5)
        .map(([courseId, count]) => ({
            course: courses.find(c => c.id === courseId),
            count
        }));
  }, [enrollments, courses]);

  const handleSettingsUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      onUpdateSettings({ moneyBackGuaranteeDays: guaranteeDays });
  };
  
  const handleToggleSuspension = (teacher: User) => {
      const newStatus = teacher.status === 'suspended' ? 'active' : 'suspended';
      onUpdateUser({ ...teacher, status: newStatus });
  };
  
  const openInvestigation = (report: Report) => {
      const teacher = users.find(u => u.id === report.reportedTeacherId);
      if (teacher) {
        setInvestigationTarget(teacher);
      }
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(newExpense.amount);
    if (newExpense.description && !isNaN(amount) && amount > 0) {
        onLogExpense(newExpense.description, amount);
        setNewExpense({ description: '', amount: '' });
    }
  };

  const handleTestimonialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTestimonial.name && newTestimonial.quote) {
        onAddTestimonial({
            ...newTestimonial,
            avatar: newTestimonial.avatar || `https://i.pravatar.cc/150?u=${Date.now()}`
        });
        setNewTestimonial({ name: '', course: '', quote: '', avatar: '' });
        alert('Testimonial added to home page!');
    }
  };
  
  const handleAdminProfileUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      onUpdateUser({ ...adminUser, ...profile });
      alert('Admin profile updated!');
  };
  
  const handleKycAction = (teacher: User, status: 'verified' | 'rejected') => {
      onUpdateUser({...teacher, kycStatus: status });
      setKycVerificationTarget(null);
  };

  const renderInvestigationModal = () => {
      if (!investigationTarget) return null;
      const targetMessages = messages.filter(m => m.senderId === investigationTarget.id || m.receiverId === investigationTarget.id);
      const targetSubmissions = submissions.filter(s => {
          const course = courses.find(c => c.assignments.some(a => a.id === s.assignmentId));
          return course && course.instructorId === investigationTarget.id;
      });

      return (
          <Modal onClose={() => setInvestigationTarget(null)}>
              <h3 className="text-xl font-bold mb-4">Investigation: {investigationTarget.name}</h3>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto p-2 text-slate-800">
                 {/* Message History */}
                <div>
                    <h4 className="font-semibold text-lg border-b pb-1 mb-2">Message History</h4>
                    <div className="space-y-2">
                        {targetMessages.length > 0 ? targetMessages.map(msg => (
                           <div key={msg.id} className="text-sm p-2 bg-slate-100 rounded">
                                <p><strong>From:</strong> {users.find(u => u.id === msg.senderId)?.name} | <strong>To:</strong> {users.find(u => u.id === msg.receiverId)?.name}</p>
                                <p className="mt-1">{msg.text}</p>
                                <p className="text-xs text-slate-500 mt-1">{new Date(msg.timestamp).toLocaleString()}</p>
                           </div>
                        )) : <p className="text-sm text-slate-500">No messages found.</p>}
                    </div>
                </div>
                 {/* Graded Submissions */}
                 <div>
                    <h4 className="font-semibold text-lg border-b pb-1 mb-2">Graded Submissions</h4>
                     <div className="space-y-2">
                        {targetSubmissions.filter(s=>s.grade).length > 0 ? targetSubmissions.filter(s=>s.grade).map(sub => (
                           <div key={sub.id} className="text-sm p-2 bg-slate-100 rounded">
                               <p><strong>Student:</strong> {users.find(u => u.id === sub.studentId)?.name} | <strong>Grade:</strong> {sub.grade}</p>
                               <pre className="text-xs bg-slate-200 p-2 rounded mt-1 overflow-x-auto"><code>{sub.content}</code></pre>
                           </div>
                        )) : <p className="text-sm text-slate-500">No graded submissions found.</p>}
                    </div>
                </div>
              </div>
          </Modal>
      )
  };

  const renderKycVerificationModal = () => {
    if (!kycVerificationTarget) return null;
    return (
        <Modal onClose={() => setKycVerificationTarget(null)}>
            <h3 className="text-xl font-bold mb-4">KYC Verification for {kycVerificationTarget.name}</h3>
            <div className="space-y-3 text-sm text-slate-800">
                <div className="flex justify-between items-center p-2 bg-slate-100 rounded"><span>BVN:</span><span className="font-mono">{kycVerificationTarget.bvn || 'Not Provided'}</span></div>
                <div className="flex justify-between items-center p-2 bg-slate-100 rounded"><span>NIN:</span><span className="font-mono">{kycVerificationTarget.nin || 'Not Provided'}</span></div>
                <div className="flex justify-between items-center p-2 bg-slate-100 rounded">
                    <span>Utility Bill:</span>
                    <div>
                        <span className="font-mono mr-2">{kycVerificationTarget.utilityBillUrl || 'Not Provided'}</span>
                        {kycVerificationTarget.utilityBillUrl && (
                            <Button size="small" variant="secondary" onClick={() => setDocumentToView(kycVerificationTarget.utilityBillUrl!)}>View</Button>
                        )}
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
                <Button variant="danger" onClick={() => handleKycAction(kycVerificationTarget, 'rejected')}>Reject</Button>
                <Button variant="primary" onClick={() => handleKycAction(kycVerificationTarget, 'verified')}>Approve</Button>
            </div>
        </Modal>
    )
  }

    return (
        <DashboardLayout>
            <div>
             <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">Admin Dashboard</h2>
            {canGoBack && (
                <Button variant="secondary" onClick={onBack}>
                    &larr; Back
                </Button>
            )}
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex flex-wrap space-x-2 sm:space-x-4">
          <button onClick={() => setActiveTab('analytics')} className={`px-3 sm:px-4 py-2 font-semibold rounded-md ${activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Analytics</button>
          <button onClick={() => setActiveTab('financials')} className={`px-3 sm:px-4 py-2 font-semibold rounded-md ${activeTab === 'financials' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Financials</button>
          <button onClick={() => setActiveTab('users')} className={`px-3 sm:px-4 py-2 font-semibold rounded-md ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Users</button>
          <button onClick={() => setActiveTab('courses')} className={`px-3 sm:px-4 py-2 font-semibold rounded-md ${activeTab === 'courses' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Courses</button>
          <button onClick={() => setActiveTab('reports')} className={`px-3 sm:px-4 py-2 font-semibold rounded-md ${activeTab === 'reports' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Reports <span className="bg-red-500 text-white text-xs rounded-full px-2 ml-1">{reports.filter(r=>r.status==='open').length}</span></button>
          <button onClick={() => setActiveTab('testimonials')} className={`px-3 sm:px-4 py-2 font-semibold rounded-md ${activeTab === 'testimonials' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Testimonials</button>
          <button onClick={() => setActiveTab('profile')} className={`px-3 sm:px-4 py-2 font-semibold rounded-md ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Admin Profile</button>
          <button onClick={() => setActiveTab('settings')} className={`px-3 sm:px-4 py-2 font-semibold rounded-md ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Settings</button>
        </nav>
      </div>
      
       {activeTab === 'analytics' && (
         <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <StatCard title="Total Students" value={students.length} />
                 <StatCard title="Total Teachers" value={teachers.length} />
                 <StatCard title="Total Courses" value={courses.length} subtext={`${courses.filter(c => c.status === 'Approved').length} Approved`} />
                 <StatCard title="Total Enrollments" value={enrollments.length} />
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
                <Card className="p-6 lg:col-span-2">
                    <h3 className="font-bold text-lg mb-4">Enrollment Trend (Simulated)</h3>
                    <div className="h-64 bg-slate-50 rounded-lg flex items-end p-4 space-x-2">
                        {[4,6,5,8,9,7,11,13].map((h, i) => <div key={i} className="w-full bg-indigo-300 rounded-t-md" style={{height: `${h*7}%`}}></div>)}
                    </div>
                </Card>
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4">Top Courses</h3>
                    <ul className="space-y-3">
                        {topCourses.map(({ course, count }) => course ? (
                           <li key={course.id} className="text-sm flex justify-between text-slate-800">
                               <span className="truncate pr-2">{course.title}</span>
                               <span className="font-bold">{count} enrollments</span>
                           </li>
                        ) : null)}
                    </ul>
                </Card>
            </div>
         </div>
       )}

      {activeTab === 'financials' && (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Revenue" value={`$${financials.totalRevenue.toFixed(2)}`} />
                <StatCard title="Platform Profit" value={`$${financials.platformProfit.toFixed(2)}`} subtext="30% commission" />
                <StatCard title="Total Teacher Payouts" value={`$${financials.totalTeacherPayouts.toFixed(2)}`} />
                <StatCard title="Total Expenses" value={`$${financials.totalExpenses.toFixed(2)}`} />
                <StatCard title="Net Profit" value={`$${financials.netProfit.toFixed(2)}`} />
                <Card className="p-6">
                    <p className="text-sm font-medium text-slate-500">Available For Withdrawal</p>
                    <p className="text-3xl font-bold text-green-600">${financials.availableForWithdrawal.toFixed(2)}</p>
                    <Button size="small" variant="primary" className="mt-2 w-full" onClick={() => setShowWithdrawModal(true)} disabled={financials.availableForWithdrawal <= 0}>Withdraw Profit</Button>
                </Card>
            </div>
            <div className="grid lg:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h3 className="font-bold text-lg mb-4 text-slate-800">Log an Expense</h3>
                    <form onSubmit={handleExpenseSubmit} className="flex items-end gap-4">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700">Description</label>
                            <input type="text" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} className="mt-1 w-full p-2 border rounded-md" required />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                            <input type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} className="mt-1 w-full p-2 border rounded-md" required />
                        </div>
                        <Button type="submit">Log</Button>
                    </form>
                </Card>
                 <Card className="p-0 text-slate-800">
                    <h4 className="text-lg font-bold p-6 pb-2">Expense History</h4>
                    <div className="overflow-y-auto max-h-60">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 sticky top-0">
                            <tr>
                                <th className="p-4 font-semibold text-sm">Date</th>
                                <th className="p-4 font-semibold text-sm">Description</th>
                                <th className="p-4 font-semibold text-sm">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.map(e => (
                                <tr key={e.id} className="border-t">
                                    <td className="p-4 text-sm">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="p-4 text-sm">{e.description}</td>
                                    <td className="p-4 text-sm font-bold text-red-600">-${e.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </Card>
            </div>
        </div>
      )}

            {activeTab === 'users' && (
                <div className="text-slate-800"> 
            <div className="flex space-x-2 border-b mb-4">
                <button onClick={() => setUserTab('teachers')} className={`px-4 py-2 font-semibold ${userTab === 'teachers' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>Teachers ({teachers.length})</button>
                <button onClick={() => setUserTab('students')} className={`px-4 py-2 font-semibold ${userTab === 'students' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-slate-500'}`}>Students ({students.length})</button>
            </div>
            <Card className="p-0">
                <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 font-semibold text-sm">Name</th>
                            <th className="p-4 font-semibold text-sm">Email</th>
                            {userTab === 'teachers' && <th className="p-4 font-semibold text-sm">Account Status</th>}
                            {userTab === 'teachers' && <th className="p-4 font-semibold text-sm">KYC Status</th>}
                            <th className="p-4 font-semibold text-sm">{userTab === 'teachers' ? 'Courses' : 'Enrolled'}</th>
                            <th className="p-4 font-semibold text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(userTab === 'teachers' ? teachers : students).map(user => (
                            <tr key={user.id} className={`border-t ${user.status === 'suspended' ? 'bg-orange-50' : ''}`}>
                                <td className="p-4 font-medium">{user.name}</td>
                                <td className="p-4">{user.email}</td>
                                {userTab === 'teachers' && <td className="p-4"><StatusBadge status={user.status} /></td>}
                                {userTab === 'teachers' && <td className="p-4"><StatusBadge status={user.kycStatus} /></td>}
                                <td className="p-4">{userTab === 'teachers' ? courses.filter(c=>c.instructorId === user.id).length : user.enrolledCourses?.length || 0}</td>
                                <td className="p-4 space-x-2 whitespace-nowrap">
                                  {userTab === 'teachers' ? (
                                    <>
                                        <Button size="small" variant="secondary" onClick={() => setKycVerificationTarget(user)}>Verify KYC</Button>
                                        <Button size="small" variant={user.status === 'suspended' ? 'primary' : 'danger'} onClick={() => handleToggleSuspension(user)}>
                                            {user.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                                        </Button>
                                    </>
                                  ) : <Button size="small" variant="secondary">Message</Button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </Card>
        </div>
      )}

      {activeTab === 'courses' && (
        <Card className="p-0 text-slate-800">
            <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-4 font-semibold text-sm">Title</th>
                        <th className="p-4 font-semibold text-sm">Instructor</th>
                        <th className="p-4 font-semibold text-sm">Price</th>
                        <th className="p-4 font-semibold text-sm">Status</th>
                        <th className="p-4 font-semibold text-sm">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {courses.map(course => (
                        <tr key={course.id} className="border-t">
                            <td className="p-4 font-medium">{course.title}</td>
                            <td className="p-4">{course.instructor || 'TBA'}</td>
                            <td className="p-4">${(course.price || 0).toFixed(2)}</td>
                            <td className="p-4"><StatusBadge status={course.status || CourseStatus.Pending} /></td>
                            <td className="p-4 space-x-2">
                                {(course.status || CourseStatus.Pending) === CourseStatus.Pending && (
                                    <>
                                        <Button size="small" onClick={() => onUpdateCourse({...course, status: CourseStatus.Approved})}>Approve</Button>
                                        <Button size="small" variant="danger" onClick={() => onUpdateCourse({...course, status: CourseStatus.Rejected})}>Reject</Button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </Card>
      )}

       {activeTab === 'reports' && (
          <Card className="p-6 text-slate-800">
              <h3 className="text-2xl font-semibold mb-4">Teacher Reports</h3>
              <div className="space-y-4">
                  {reports.map(report => (
                      <div key={report.id} className="p-4 border rounded-lg flex justify-between items-center">
                          <div>
                              <p><strong>Teacher:</strong> {users.find(u => u.id === report.reportedTeacherId)?.name}</p>
                              <p className="text-sm"><strong>Reporter:</strong> {users.find(u => u.id === report.reporterId)?.name}</p>
                              <p className="text-xs text-slate-500 mt-2 italic">"{report.reason}"</p>
                          </div>
                          <Button size="small" variant="secondary" onClick={() => openInvestigation(report)}>Investigate</Button>
                      </div>
                  ))}
                  {reports.length === 0 && <p className="text-center text-slate-400 py-8">No reports filed.</p>}
              </div>
          </Card>
      )}

      {activeTab === 'testimonials' && (
        <div className="space-y-8 text-slate-800">
            <Card className="p-8">
                <h3 className="text-xl font-bold mb-6">Add New Testimonial</h3>
                <form onSubmit={handleTestimonialSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Student Name</label>
                            <input 
                                type="text" 
                                value={newTestimonial.name} 
                                onChange={e => setNewTestimonial({...newTestimonial, name: e.target.value})} 
                                className="mt-1 w-full p-2 border rounded-md" 
                                placeholder="e.g. John Doe"
                                required 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Course Name</label>
                            <input 
                                type="text" 
                                value={newTestimonial.course} 
                                onChange={e => setNewTestimonial({...newTestimonial, course: e.target.value})} 
                                className="mt-1 w-full p-2 border rounded-md" 
                                placeholder="e.g. Web Development"
                                required 
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Student Quote</label>
                        <textarea 
                            value={newTestimonial.quote} 
                            onChange={e => setNewTestimonial({...newTestimonial, quote: e.target.value})} 
                            className="mt-1 w-full p-2 border rounded-md" 
                            rows={3}
                            placeholder="Share their experience..."
                            required 
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit">Publish Testimonial</Button>
                    </div>
                </form>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testimonials.map(t => (
                    <Card key={t.id} className="p-6 border flex flex-col justify-between">
                        <div>
                            <p className="italic text-slate-600 mb-4 text-sm">"{t.quote}"</p>
                            <div className="flex items-center space-x-3 mb-6">
                                <img src={t.avatar || `https://i.pravatar.cc/150?u=${t.id}`} className="w-10 h-10 rounded-full bg-slate-200" alt="" />
                                <div>
                                    <p className="font-bold text-sm">{t.name}</p>
                                    <p className="text-xs text-slate-500">{t.course}</p>
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="danger" 
                            size="small" 
                            className="w-full" 
                            onClick={() => { if(confirm('Delete this testimonial?')) onDeleteTestimonial(t.id); }}
                        >
                            Remove
                        </Button>
                    </Card>
                ))}
            </div>
        </div>
      )}
      
       {activeTab === 'profile' && (
        <Card className="p-8 max-w-3xl mx-auto text-slate-800">
            <form onSubmit={handleAdminProfileUpdate} className="space-y-8">
                <section>
                    <h3 className="text-2xl font-semibold mb-6">Admin Profile & Payouts</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="mt-1 w-full p-2 border rounded-md"/>
                        </div>
                    </div>
                </section>
                <section>
                    <h3 className="text-2xl font-semibold mb-6 flex items-center"><IdentificationIcon /> <span className="ml-2">KYC Verification</span></h3>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bank Verification Number (BVN)</label>
                            <input type="text" value={profile.bvn} onChange={e => setProfile({...profile, bvn: e.target.value})} className="mt-1 w-full p-2 border rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">National Identification Number (NIN)</label>
                            <input type="text" value={profile.nin} onChange={e => setProfile({...profile, nin: e.target.value})} className="mt-1 w-full p-2 border rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Utility Bill</label>
                            <input type="file" onChange={(e) => onUpdateUser({...adminUser, utilityBillUrl: e.target.files ? e.target.files[0].name : ''})} className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                             {adminUser.utilityBillUrl && <p className="text-xs text-green-600 mt-1">File uploaded: {adminUser.utilityBillUrl}</p>}
                        </div>
                    </div>
                </section>
                <section>
                    <h3 className="text-2xl font-semibold mb-6 flex items-center"><BankIcon /> <span className="ml-2">Banking Details</span></h3>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                            <input type="text" value={profile.bankName} onChange={e => setProfile({...profile, bankName: e.target.value})} className="mt-1 w-full p-2 border rounded-md"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                                <input type="text" value={profile.accountNumber} onChange={e => setProfile({...profile, accountNumber: e.target.value})} className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Account Name</label>
                                <input type="text" value={profile.accountName} onChange={e => setProfile({...profile, accountName: e.target.value})} className="mt-1 w-full p-2 border rounded-md"/>
                            </div>
                        </div>
                    </div>
                </section>
                <div className="text-right pt-4"> <Button type="submit">Save Changes</Button> </div>
            </form>
        </Card>
      )}
      
      {activeTab === 'settings' && (
        <Card className="p-8 max-w-2xl mx-auto text-slate-800">
            <h3 className="text-2xl font-semibold mb-6">Platform Settings</h3>
            <form onSubmit={handleSettingsUpdate}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="guarantee-days" className="block text-sm font-medium text-gray-700">Money-Back Guarantee (Days)</label>
                        <input
                            id="guarantee-days"
                            type="number"
                            value={guaranteeDays}
                            onChange={e => setGuaranteeDays(parseInt(e.target.value, 10) || 0)}
                            className="mt-1 w-full p-2 border rounded-md"
                        />
                        <p className="text-xs text-slate-500 mt-1">Number of days a student can request a refund after enrolling.</p>
                    </div>
                </div>
                <div className="text-right mt-6">
                    <Button type="submit">Save Settings</Button>
                </div>
            </form>
        </Card>
      )}

      {showWithdrawModal && (
          <Modal onClose={() => setShowWithdrawModal(false)}>
            <h3 className="text-xl font-bold mb-4 text-slate-800">Confirm Profit Withdrawal</h3>
            {!(adminUser.bankName && adminUser.accountNumber) ? (
                 <div className="text-center p-4 bg-red-50 text-red-700 rounded-lg">
                    <p className="font-bold">Information Required</p>
                    <p className="text-sm">Please complete your Banking Details in the 'Admin Profile' section before you can withdraw funds.</p>
                </div>
            ) : (
                <div className="space-y-3 text-slate-800">
                    <div className="flex justify-between items-center p-3 bg-slate-100 rounded-lg"><span>Available Balance:</span><span className="font-bold text-lg">${financials.availableForWithdrawal.toFixed(2)}</span></div>
                    <hr/>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg"><span>Amount to be Deposited:</span><span className="font-bold text-xl text-green-700">${financials.availableForWithdrawal.toFixed(2)}</span></div>
                    <div className="text-sm text-slate-500 text-left p-2 border-t mt-2">
                        <p>Funds will be sent to:</p>
                        <p><strong>Bank:</strong> {adminUser.bankName}</p>
                        <p><strong>Account:</strong> {adminUser.accountNumber} ({adminUser.accountName})</p>
                    </div>
                    <p className="text-xs text-slate-500 text-center pt-2">This amount will be transferred to your bank account within 3-5 business days.</p>
                    <div className="pt-4 flex justify-end space-x-2">
                        <Button variant="secondary" onClick={() => setShowWithdrawModal(false)}>Cancel</Button>
                        <Button variant="danger" onClick={() => { onAdminWithdrawal(financials.availableForWithdrawal); setShowWithdrawModal(false); }}>Confirm Withdrawal</Button>
                    </div>
                </div>
            )}
          </Modal>
      )}

      {renderInvestigationModal()}
      {renderKycVerificationModal()}
      {documentToView && (
        <DocumentViewerModal documentUrl={documentToView} onClose={() => setDocumentToView(null)} />
      )}
    </div>
        </DashboardLayout>
    );
};

export default AdminDashboard;
