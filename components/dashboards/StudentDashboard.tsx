
import React, { useEffect, useState } from 'react';
import DashboardLayout from '../layout/DashboardLayout';
import { User, Course, Quiz, Submission, View } from '../../types';
import Card from '../Card';
import Button from '../Button';
import CodeEditor from '../CodeEditor';
import Modal from '../Modal';
import { api } from '../../lib/api';

interface StudentDashboardProps {
  user: User;
  courses: Course[];
  submissions: Submission[];
  onSelectCourse: (course: Course) => void;
  onNavigate: (view: View) => void;
  onCreateReport: (reportedTeacherId: string, courseId: string, reason: string) => void;
  onBack: () => void;
  canGoBack: boolean;
}

type StudentTabView = 'overview' | 'grades' | 'practice';
type PracticeBoardView = 'list' | 'quiz' | 'results' | 'code';

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, courses, submissions, onSelectCourse, onNavigate, onCreateReport, onBack, canGoBack }) => {
  const [activeTab, setActiveTab] = useState<StudentTabView>('overview');
  const [practiceView, setPracticeView] = useState<PracticeBoardView>('list');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [showReportModal, setShowReportModal] = useState<Course | null>(null);
  const [reportReason, setReportReason] = useState('');

  const enrolledCourses = courses.filter(c => user.enrolledCourses?.includes(c.id));
  const availableQuizzes = quizzes.filter(q => user.enrolledCourses?.includes(q.courseId));
  
  const assignments = enrolledCourses.flatMap(c => 
    c.assignments.map(a => {
      const submission = submissions.find(s => s.assignmentId === a.id && s.studentId === user.id);
      return {
          ...a,
          courseTitle: c.title,
          submitted: !!submission,
          grade: submission?.grade ?? null,
      };
    })
  );
  
  const gradedAssignments = assignments.filter(a => a.submitted && a.grade);

  useEffect(() => {
    void api.getQuizzes()
      .then((data) => setQuizzes(data.quizzes || []))
      .catch(() => setQuizzes([]));
  }, []);

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setScore(0);
    setPracticeView('quiz');
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    let correctAnswers = 0;
    activeQuiz.questions.forEach(q => {
        if(userAnswers[q.id] === q.correctAnswer) {
            correctAnswers++;
        }
    });
    setScore(correctAnswers);
    setPracticeView('results');
  };

  const handleSubmitReport = async () => {
    if (showReportModal && reportReason) {
      try {
        const response = await fetch('/api/complaints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_id: showReportModal.instructorId,
            course_slug: showReportModal.id,
            complaint_text: reportReason
          })
        });
        if (response.ok) {
          alert('Complaint submitted successfully. It will be reviewed by an administrator.');
          setShowReportModal(null);
          setReportReason('');
        } else {
          alert('Failed to submit complaint. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting complaint:', error);
        alert('An error occurred. Please try again.');
      }
    }
  };

  const handleMarkCompleted = async (courseSlug: string) => {
    if (confirm('Are you sure you want to mark this course as completed? This action cannot be undone.')) {
      try {
        const response = await fetch('/api/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            course_slug: courseSlug,
            action: 'complete'
          })
        });
        if (response.ok) {
          alert('Course marked as completed! Funds may now be available to the teacher.');
        } else {
          alert('Failed to mark course as completed. Please try again.');
        }
      } catch (error) {
        console.error('Error marking course complete:', error);
        alert('An error occurred. Please try again.');
      }
    }
  };
  
  const resetPracticeBoard = () => {
    setPracticeView('list');
    setActiveQuiz(null);
  }

  const TabButton: React.FC<{ view: StudentTabView | 'messages' | 'live'; label: string }> = ({ view, label }) => (
    <button
      onClick={() => view === 'messages' ? onNavigate('messages') : view === 'live' ? onNavigate('liveClassroom') : setActiveTab(view as StudentTabView)}
      className={`px-4 py-2 font-semibold rounded-md transition-colors duration-200 ${
        activeTab === view
          ? 'bg-indigo-600 text-white'
          : 'text-slate-600 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
  
  const renderPracticeBoard = () => {
    if (practiceView === 'list') {
      return (
        <div>
          <h3 className="text-2xl font-semibold mb-4 text-slate-900">Practice Board</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <Card className="p-6 flex flex-col justify-between bg-indigo-50 hover:bg-indigo-100 border-indigo-100">
                <div>
                    <h4 className="text-xl font-bold">Practice Code</h4>
                    <p className="text-sm text-slate-500 mb-4">Hone your skills in our code editor.</p>
                </div>
                <Button onClick={() => setPracticeView('code')}>Open Editor</Button>
              </Card>
            {availableQuizzes.map(quiz => (
              <Card key={quiz.id} className="p-6 flex flex-col justify-between">
                <div>
                    <h4 className="text-xl font-bold">{quiz.title}</h4>
                    <p className="text-sm text-slate-500 mb-4">{courses.find(c => c.id === quiz.courseId)?.title}</p>
                </div>
                <Button onClick={() => startQuiz(quiz)}>Start Quiz</Button>
              </Card>
            ))}
          </div>
        </div>
      );
    }
    
    if (practiceView === 'code') {
        return (
            <div>
                <Button variant="secondary" onClick={resetPracticeBoard} className="mb-4">&larr; Back to Practice Board</Button>
                <CodeEditor />
            </div>
        )
    }

    if (practiceView === 'quiz' && activeQuiz) {
      const question = activeQuiz.questions[currentQuestionIndex];
      return (
        <Card className="p-8 border-indigo-100 shadow-indigo-100/50">
            <h3 className="text-2xl font-bold mb-2">{activeQuiz.title}</h3>
            <p className="text-slate-500 mb-6">Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}</p>
            
            <p className="text-lg font-semibold mb-6 text-slate-800">{question.text}</p>
            
            <div className="space-y-3 mb-8">
                {question.options.map(option => (
                    <label key={option} className={`block w-full text-left p-4 rounded-lg border-2 cursor-pointer transition-colors ${userAnswers[question.id] === option ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'}`}>
                        <input type="radio" name={question.id} value={option} checked={userAnswers[question.id] === option} onChange={() => handleAnswerSelect(question.id, option)} className="sr-only" />
                        <span className="font-medium">{option}</span>
                    </label>
                ))}
            </div>

            <div className="flex justify-between items-center">
                <Button variant="secondary" onClick={() => setCurrentQuestionIndex(i => Math.max(0, i-1))} disabled={currentQuestionIndex === 0}>Previous</Button>
                {currentQuestionIndex < activeQuiz.questions.length - 1 ? (
                    <Button onClick={() => setCurrentQuestionIndex(i => i + 1)}>Next</Button>
                ) : (
                    <Button onClick={handleSubmitQuiz} className="bg-green-600 hover:bg-green-700">Submit Quiz</Button>
                )}
            </div>
        </Card>
      );
    }
    
    if (practiceView === 'results' && activeQuiz) {
        return (
            <Card className="p-8">
                <h3 className="text-2xl font-bold mb-2">Quiz Results</h3>
                <p className="text-lg font-semibold text-indigo-600 mb-6">You scored: {score} / {activeQuiz.questions.length} ({(score/activeQuiz.questions.length * 100).toFixed(0)}%)</p>
                <div className="space-y-6 mb-8">
                    {activeQuiz.questions.map((q, i) => (
                        <div key={q.id} className="p-4 rounded-xl bg-slate-50 border-l-4 text-slate-800" style={{borderColor: userAnswers[q.id] === q.correctAnswer ? '#10B981' : '#EF4444'}}>
                            <div className="flex justify-between items-start">
                                <p className="font-bold mb-2">{i+1}. {q.text}</p>
                            </div>
                            <p className="text-sm">Your answer: <span className="font-medium">{userAnswers[q.id] || 'Not answered'}</span></p>
                            {userAnswers[q.id] !== q.correctAnswer && <p className="text-sm text-green-700 font-bold">Correct answer: <span>{q.correctAnswer}</span></p>}
                        </div>
                    ))}
                </div>
                 <div className="flex justify-center space-x-4">
                    <Button variant="secondary" onClick={() => startQuiz(activeQuiz)}>Try Again</Button>
                    <Button onClick={resetPracticeBoard}>Back to Quizzes</Button>
                </div>
            </Card>
        )
    }

    return null;
  };

  return (
    <DashboardLayout>
      <div className="text-slate-800">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h2 className="text-3xl font-bold">Student Dashboard</h2>
            <p className="text-slate-600">Welcome back, {user.name}!</p>
        </div>
        {canGoBack && (
            <Button variant="secondary" onClick={onBack}>
                &larr; Back
            </Button>
        )}
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex space-x-4 overflow-x-auto pb-1">
          <TabButton view="overview" label="Overview" />
          <TabButton view="grades" label="Grades" />
          <TabButton view="practice" label="Practice Board" />
          <TabButton view="messages" label="Messages" />
          <TabButton view="live" label="Live Classroom" />
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-semibold mb-4">My Courses</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {enrolledCourses.length > 0 ? (
                  enrolledCourses.map(course => (
                    <Card key={course.id} >
                      <img src={course.imageUrl || 'https://via.placeholder.com/400x200'} alt={course.title} className="w-full h-40 object-cover cursor-pointer" onClick={() => onSelectCourse(course)}/>
                      <div className="p-4">
                        <h4 className="font-bold text-lg">{course.title}</h4>
                        <p className="text-sm text-slate-500">{course.instructor || 'Instructor TBA'}</p>
                        <div className="flex space-x-2 mt-4">
                          <Button 
                              size="small" 
                              className="flex-1" 
                              onClick={() => handleMarkCompleted(course.id)}
                          >
                              Mark Completed
                          </Button>
                          <Button 
                              size="small" 
                              variant="danger" 
                              className="opacity-60 hover:opacity-100" 
                              onClick={() => setShowReportModal(course)}
                          >
                              Report
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-slate-500">You are not enrolled in any courses yet.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">Upcoming</h3>
              <div className="bg-white p-4 rounded-xl shadow-md space-y-3">
                {assignments.filter(a => !a.submitted).length > 0 ? (
                    assignments.filter(a => !a.submitted).map(a => (
                        <div key={a.id} className="text-sm">
                            <p className="font-semibold">{a.title}</p>
                            <p className="text-slate-500">Due: {a.dueDate}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-slate-500">No upcoming assignments. Great job!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'grades' && (
          <div>
            <h3 className="text-2xl font-semibold mb-4">My Grades</h3>
            <Card className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm">Course</th>
                                <th className="p-4 font-semibold text-sm">Assignment</th>
                                <th className="p-4 font-semibold text-sm">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {gradedAssignments.length > 0 ? (
                                gradedAssignments.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium">{a.courseTitle}</td>
                                        <td className="p-4">{a.title}</td>
                                        <td className="p-4 font-bold text-indigo-600">{a.grade}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-500 italic">No grades to show yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
          </div>
        )}
        
        {activeTab === 'practice' && (
          renderPracticeBoard()
        )}
      </div>

       {showReportModal && (
          <Modal onClose={() => setShowReportModal(null)}>
              <h3 className="text-xl font-bold mb-4 text-red-600">Report Instructor</h3>
              <p className="mb-1 text-sm">You are reporting the instructor for the course: <span className="font-semibold">{showReportModal.title}</span>.</p>
              <p className="text-slate-500 text-xs mb-4">Please provide a reason for your report. This will be reviewed by an administrator.</p>
              <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-red-500 text-slate-800" rows={4} placeholder="Explain the issue..." required/>
              <div className="mt-6 flex justify-end space-x-2">
                <Button variant="secondary" onClick={() => setShowReportModal(null)}>Cancel</Button>
                <Button variant="danger" onClick={handleSubmitReport} disabled={!reportReason}>Submit Report</Button>
              </div>
          </Modal>
      )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;
