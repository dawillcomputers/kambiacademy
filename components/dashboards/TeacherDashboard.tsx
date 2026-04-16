
import React, { useState } from 'react';
import { User, Course, Submission, Enrollment, CourseLevel, CourseStatus, View } from '../../types';
import Card from '../Card';
import Button from '../Button';
import Modal from '../Modal';
import CodeEditor from '../CodeEditor';

interface TeacherDashboardProps {
  user: User;
  courses: Course[];
  submissions: Submission[];
  enrollments: Enrollment[];
  onUpdateSubmission: (submission: Submission) => void;
  onUpdateCourse: (course: Course) => void;
  onCreateCourse: (courseData: Omit<Course, 'id' | 'instructorId' | 'instructor' | 'imageUrl' | 'materials' | 'assignments' | 'liveClassLinks' | 'announcements'| 'status'>) => void;
  onUpdateUser: (user: User) => void;
  onWithdrawal: (teacherId: string) => void;
  onNavigate: (view: View) => void;
  onBack: () => void;
  canGoBack: boolean;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, courses, submissions, enrollments, onUpdateSubmission, onUpdateCourse, onCreateCourse, onUpdateUser, onWithdrawal, onNavigate, onBack, canGoBack }) => {
  const [view, setView] = useState<'courses' | 'submissions' | 'earnings' | 'profile'>('courses');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showModal, setShowModal] = useState<null | 'createCourse' | 'withdraw' | 'grade'>(null);
  const [gradingTarget, setGradingTarget] = useState<Submission | null>(null);
  const [gradeInput, setGradeInput] = useState('');
  const [newCourse, setNewCourse] = useState({ title: '', description: '', level: 'Foundation' as CourseLevel, price: 49.99 });
  const [profile, setProfile] = useState({ 
      name: user.name, 
      bio: user.bio || '', 
      tin: user.tin || '',
      bvn: user.bvn || '',
      nin: user.nin || '',
      bankName: user.bankName || '',
      accountNumber: user.accountNumber || '',
      accountName: user.accountName || '',
  });

  const taughtCourses = courses.filter(c => c.instructorId === user.id);
  const taughtCourseIds = taughtCourses.map(c => c.id);
  
  const teacherSubmissions = submissions.filter(s => {
    const assignment = courses.flatMap(c => c.assignments).find(a => a.id === s.assignmentId);
    return assignment && taughtCourseIds.includes(assignment.courseId);
  });

  const totalEarnings = user.earnings?.total ?? 0;
  const paidOut = user.earnings?.paidOut ?? 0;
  const availableBalance = user.earnings?.available_balance ?? 0;
  const heldBalance = user.earnings?.held_balance ?? 0;
  const currentBalance = availableBalance;

  const handleCreateCourse = () => {
    onCreateCourse(newCourse);
    setShowModal(null);
    setNewCourse({ title: '', description: '', level: 'Foundation' as CourseLevel, price: 49.99 });
  };

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedUser = { ...user, ...profile };
    if ((user.kycStatus === 'unverified' || user.kycStatus === 'rejected') && profile.bvn && profile.nin && user.utilityBillUrl) {
      updatedUser.kycStatus = 'pending';
    }
    onUpdateUser(updatedUser);
    alert('Profile Updated!');
  };

  const handleSaveGrade = () => {
    if (gradingTarget) {
        onUpdateSubmission({ ...gradingTarget, grade: gradeInput });
        setShowModal(null);
        setGradingTarget(null);
        setGradeInput('');
    }
  };

  const getStudentCount = (courseId: string) => {
    return enrollments.filter(e => e.courseId === courseId).length;
  };
  
  const StatusBadge: React.FC<{ status: CourseStatus }> = ({ status }) => {
    const styles = {
        [CourseStatus.Approved]: 'bg-green-100 text-green-800',
        [CourseStatus.Pending]: 'bg-yellow-100 text-yellow-800',
        [CourseStatus.Rejected]: 'bg-red-100 text-red-800',
    };
    return <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-3xl font-bold">Teacher Dashboard</h2>
            <p className="text-slate-600">Manage your profile, courses, and student progress.</p>
        </div>
        {canGoBack && (
            <Button variant="secondary" onClick={onBack}>
                &larr; Back
            </Button>
        )}
      </div>

      <div className="mb-6 border-b border-slate-200 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-4 min-w-max pb-1">
          <button onClick={() => setView('courses')} className={`px-4 py-2 font-semibold rounded-md transition-colors ${view === 'courses' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>My Courses</button>
          <button onClick={() => setView('submissions')} className={`px-4 py-2 font-semibold rounded-md transition-colors ${view === 'submissions' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Submissions <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">{teacherSubmissions.filter(s=>!s.grade).length}</span></button>
          <button onClick={() => setView('earnings')} className={`px-4 py-2 font-semibold rounded-md transition-colors ${view === 'earnings' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Earnings</button>
          <button onClick={() => setView('profile')} className={`px-4 py-2 font-semibold rounded-md transition-colors ${view === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>Profile</button>
          <button onClick={() => onNavigate('messages')} className="px-4 py-2 font-semibold rounded-md text-slate-600 hover:bg-slate-200">Messages</button>
        </nav>
      </div>

      {view === 'courses' && (
        <div>
            <div className="text-right mb-4">
                <Button onClick={() => setShowModal('createCourse')}>Create New Course</Button>
            </div>
            <div className="space-y-4">
            {taughtCourses.map(course => (
                <Card key={course.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center">
                    <div className="flex-grow">
                        <div className="flex items-center space-x-3">
                             <StatusBadge status={course.status || CourseStatus.Pending} />
                             <h4 className="font-bold text-lg">{course.title}</h4>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-slate-500 mt-1">
                            <span>{course.level}</span>
                            <span>•</span>
                            <span>{getStudentCount(course.id)} Students</span>
                        </div>
                    </div>
                    <Button size="small" onClick={() => setSelectedCourse(course)} className="mt-4 sm:mt-0 self-start sm:self-center">Manage</Button>
                </Card>
            ))}
            </div>
        </div>
      )}

      {view === 'submissions' && (
        <Card className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-4 font-semibold text-sm text-slate-500 uppercase">Student</th>
                            <th className="p-4 font-semibold text-sm text-slate-500 uppercase">Assignment</th>
                            <th className="p-4 font-semibold text-sm text-slate-500 uppercase">Submitted</th>
                            <th className="p-4 font-semibold text-sm text-slate-500 uppercase">Grade</th>
                            <th className="p-4 font-semibold text-sm text-slate-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {teacherSubmissions.length > 0 ? teacherSubmissions.map(s => {
                            const assignment = courses.flatMap(c => c.assignments).find(a => a.id === s.assignmentId);
                            return (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium">Student #{s.studentId}</td>
                                    <td className="p-4 text-slate-600">{assignment?.title}</td>
                                    <td className="p-4 text-sm text-slate-500">{new Date(s.submittedAt).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        {s.grade ? (
                                            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{s.grade}</span>
                                        ) : (
                                            <span className="text-slate-400 italic">Pending</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <Button size="small" variant="secondary" onClick={() => { setGradingTarget(s); setShowModal('grade'); setGradeInput(s.grade || ''); }}>Review</Button>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">No submissions found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
      )}

      {view === 'earnings' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6"><p className="text-sm text-slate-500">Total Earnings</p><p className="text-3xl font-bold">${totalEarnings.toFixed(2)}</p></Card>
            <Card className="p-6"><p className="text-sm text-slate-500">Paid Out</p><p className="text-3xl font-bold text-green-600">${paidOut.toFixed(2)}</p></Card>
            <Card className="p-6">
                <p className="text-sm text-slate-500">Available Balance</p>
                <p className="text-3xl font-bold text-blue-600">${availableBalance.toFixed(2)}</p>
                <Button size="small" className="mt-2 w-full" onClick={() => setShowModal('withdraw')} disabled={availableBalance <= 0}>Withdraw</Button>
            </Card>
            <Card className="p-6"><p className="text-sm text-slate-500">Held Balance</p><p className="text-3xl font-bold text-orange-600">${heldBalance.toFixed(2)}</p><p className="text-xs text-slate-400">Released when students complete courses</p></Card>
          </div>
        </div>
      )}

      {view === 'profile' && (
          <Card className="p-8 max-w-3xl mx-auto">
             <form onSubmit={handleProfileUpdate} className="space-y-8">
                <section>
                    <h3 className="text-2xl font-semibold mb-6">Profile Settings</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Display Name</label>
                            <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="mt-1 w-full p-2 border rounded-md"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Bio / Qualifications</label>
                            <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="mt-1 w-full p-2 border rounded-md" rows={4}/>
                        </div>
                    </div>
                </section>
                <div className="text-right"> <Button type="submit">Save Profile</Button> </div>
            </form>
          </Card>
      )}

      {showModal === 'createCourse' && (
        <Modal onClose={() => setShowModal(null)}>
            <h3 className="text-xl font-bold mb-4">Create New Course</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700">Course Title</label>
                    <input type="text" placeholder="e.g. Master React in 30 Days" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} className="w-full p-2 border rounded mt-1" required/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Course Description</label>
                    <textarea placeholder="Describe what students will learn..." value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} className="w-full p-2 border rounded" rows={4} required/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Level</label>
                        <select value={newCourse.level} onChange={e => setNewCourse({...newCourse, level: e.target.value as CourseLevel})} className="w-full p-2 border rounded mt-1">
                            <option value="Foundation">Foundation</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Price ($)</label>
                        <input type="number" value={newCourse.price} onChange={e => setNewCourse({...newCourse, price: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded mt-1" required/>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex justify-end"> <Button onClick={handleCreateCourse}>Submit for Review</Button> </div>
        </Modal>
      )}

      {showModal === 'grade' && gradingTarget && (
        <Modal onClose={() => { setShowModal(null); setGradingTarget(null); }}>
            <h3 className="text-xl font-bold mb-2">Grade Submission</h3>
            <p className="text-sm text-slate-500 mb-4">Reviewing work for: <span className="font-semibold text-indigo-600">Student #{gradingTarget.studentId}</span></p>
            <div className="mb-4">
                <p className="text-sm font-medium mb-1">Student Work Content:</p>
                <div className="max-h-60 overflow-y-auto">
                    <CodeEditor language="text" initialCode={gradingTarget.content} />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Input Grade (e.g. A, B+, 90/100)</label>
                <input 
                    type="text" 
                    value={gradeInput} 
                    onChange={e => setGradeInput(e.target.value)} 
                    placeholder="Enter grade..." 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                />
            </div>
            <div className="mt-6 flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setShowModal(null)}>Cancel</Button>
                <Button onClick={handleSaveGrade}>Save Grade</Button>
            </div>
        </Modal>
      )}

      {showModal === 'withdraw' && (
        <Modal onClose={() => setShowModal(null)}>
            <h3 className="text-xl font-bold mb-4 text-red-600">Confirm Payout</h3>
            <p className="text-sm text-slate-600 mb-6">You are requesting a payout of <strong>${currentBalance.toFixed(2)}</strong> to your registered bank account. This action is final.</p>
            <div className="flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setShowModal(null)}>Cancel</Button>
                <Button variant="danger" onClick={() => { onWithdrawal(user.id); setShowModal(null); }}>Confirm Payout</Button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default TeacherDashboard;
