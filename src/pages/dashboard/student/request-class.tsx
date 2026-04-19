import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Course } from '../../../../types';
import { api } from '../../../../lib/api';
import Button from '../../../../components/Button';
import Card from '../../../../components/Card';

interface StudentRequestClassProps {
  user: User;
  courses: Course[];
}

const StudentRequestClass: React.FC<StudentRequestClassProps> = ({ user, courses }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [classInfo, setClassInfo] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [joining, setJoining] = useState(false);
  const enrolledCourses = courses.filter((course) => user.enrolledCourses?.includes(course.id));

  const handleLookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inviteCode.trim()) {
      return;
    }

    setStatusMessage('');
    try {
      const response = await api.getInviteInfo(inviteCode.trim());
      setClassInfo(response.class);
    } catch (error) {
      setClassInfo(null);
      setStatusMessage(error instanceof Error ? error.message : 'Unable to find that class invite.');
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      return;
    }

    setJoining(true);
    setStatusMessage('');
    try {
      const response = await api.joinClass(inviteCode.trim());
      setStatusMessage(response.message || 'Joined class successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to join this class.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Join A Class</h1>
        <p className="text-gray-600">Enter a teacher invite code to join a private class, then use live sessions and chat from your student dashboard.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6 text-slate-950">Use an invite code</h2>
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Invite code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value)}
                placeholder="Paste the class code your teacher shared"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-slate-900"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Preview Class</Button>
              {classInfo && (
                <Button type="button" variant="secondary" onClick={handleJoin} disabled={joining}>
                  {joining ? 'Joining...' : 'Join Class'}
                </Button>
              )}
            </div>
          </form>

          {statusMessage && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {statusMessage}
            </div>
          )}

          {classInfo && (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Class Preview</p>
              <h3 className="mt-3 text-xl font-bold text-slate-950">{classInfo.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{classInfo.description || 'No class description provided.'}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-sm text-slate-500">Teacher</p>
                  <p className="mt-1 font-semibold text-slate-900">{classInfo.tutor_name}</p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3">
                  <p className="text-sm text-slate-500">Members</p>
                  <p className="mt-1 font-semibold text-slate-900">{classInfo.member_count}/{classInfo.max_students}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6 bg-slate-50 border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Need a teacher session?</h2>
            <p className="text-sm text-slate-700 leading-6">
              If you need extra help on one of your enrolled courses, open the classroom chat and ask your teacher for a private class invite or a live session slot.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/student/chat">
                <Button>Open Chat</Button>
              </Link>
              <Link to="/student/live">
                <Button variant="secondary">Open Live Classes</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 text-slate-950">Your enrolled courses</h2>
            <div className="space-y-3">
              {enrolledCourses.length ? enrolledCourses.map((course) => (
                <div key={course.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="font-semibold text-slate-900">{course.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{course.instructor || 'Kambi Academy'} • {course.level}</p>
                </div>
              )) : (
                <p className="text-sm text-slate-600">Enroll in a course first so your teacher can add you to a private class.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentRequestClass;