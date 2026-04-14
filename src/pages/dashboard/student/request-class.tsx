import React, { useState } from 'react';
import { User, Course } from '../../../../types';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface StudentRequestClassProps {
  user: User;
  courses: Course[];
}

const StudentRequestClass: React.FC<StudentRequestClassProps> = ({ user, courses }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enrolledCourses = courses.filter(c => user.enrolledCourses?.includes(c.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !topic || !description) return;

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      alert('Class request submitted successfully! You will be notified when it\'s scheduled.');
      setSelectedCourse('');
      setTopic('');
      setDescription('');
      setPreferredTime('');
      setUrgency('medium');
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Ask for Help</h1>
        <p className="text-gray-600">Get one-on-one help from your teacher on topics you're stuck on</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Request Form */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6">Tell Us What You Need</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related Course *
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a course</option>
                {enrolledCourses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., React Hooks, CSS Grid, JavaScript Promises"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you need help with, specific questions, or concepts you're struggling with..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgency Level
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as 'low' | 'medium' | 'high')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low - Within 1-2 weeks</option>
                <option value="medium">Medium - Within 3-5 days</option>
                <option value="high">High - As soon as possible</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={!selectedCourse || !topic || !description || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
            </Button>
          </form>
        </Card>

        {/* Info Panel */}
        <div className="space-y-6">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4">How It Works</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
                <div>
                  <h3 className="font-semibold text-blue-900">Submit Your Request</h3>
                  <p className="text-sm text-blue-700">Tell us what topic you need help with</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
                <div>
                  <h3 className="font-semibold text-blue-900">Instructor Review</h3>
                  <p className="text-sm text-blue-700">Our instructors review and schedule the session</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
                <div>
                  <h3 className="font-semibold text-blue-900">Live Session</h3>
                  <p className="text-sm text-blue-700">Join the interactive live class</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Response Times</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">High Priority</span>
                <span className="text-sm font-medium text-green-600">Within 24 hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Medium Priority</span>
                <span className="text-sm font-medium text-blue-600">Within 3-5 days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Low Priority</span>
                <span className="text-sm font-medium text-gray-600">Within 1-2 weeks</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-green-50 border-green-200">
            <h2 className="text-xl font-bold text-green-900 mb-4">💡 Tips for Better Requests</h2>
            <ul className="text-sm text-green-800 space-y-2">
              <li>• Be specific about what you need help with</li>
              <li>• Include code examples or error messages</li>
              <li>• Mention what you've already tried</li>
              <li>• Specify your current skill level</li>
              <li>• Include links to relevant materials</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Recent Requests */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Your Recent Requests</h2>
        <div className="space-y-3">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">React State Management</h3>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Scheduled</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Advanced React and TypeScript</p>
            <p className="text-xs text-gray-500">Requested 2 days ago • Session on Friday 3 PM</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">CSS Flexbox Layout</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">In Review</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">Introduction to Web Development</p>
            <p className="text-xs text-gray-500">Requested 5 days ago</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentRequestClass;