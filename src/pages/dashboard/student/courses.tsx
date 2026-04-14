import React, { useState } from 'react';
import { Course, User } from '../../../../types';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface StudentCoursesProps {
  user: User;
  courses: Course[];
  onSelectCourse: (course: Course) => void;
}

const StudentCourses: React.FC<StudentCoursesProps> = ({ user, courses, onSelectCourse }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'available'>('enrolled');

  const enrolledCourses = courses.filter(c => user.enrolledCourses?.includes(c.id));
  const availableCourses = courses.filter(c => !user.enrolledCourses?.includes(c.id));

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.summary.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === 'enrolled') return matchesSearch && enrolledCourses.includes(course);
    if (filter === 'available') return matchesSearch && availableCourses.includes(course);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Courses</h1>
        <p className="text-gray-600">See all the courses you're taking and find new ones to join</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search for courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('enrolled')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'enrolled'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            My Courses ({enrolledCourses.length})
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'available'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Available Courses ({availableCourses.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Courses
          </button>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map(course => {
          const isEnrolled = enrolledCourses.includes(course);

          return (
            <Card key={course.id} className="p-6 hover:shadow-lg transition-shadow">
              <img
                src={course.imageUrl || 'https://via.placeholder.com/300x200'}
                alt={course.title}
                className="w-full h-40 object-cover rounded-lg mb-4"
              />

              <div className="mb-4">
                <h3 className="font-bold text-lg mb-2">{course.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{course.summary}</p>

                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    course.level === 'Foundation' ? 'bg-green-100 text-green-800' :
                    course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {course.level}
                  </span>
                  <span className="text-sm text-gray-500">{course.durationLabel}</span>
                </div>

                <p className="text-sm text-gray-500">by {course.instructor}</p>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-blue-600">{course.priceLabel}</span>
                <Button
                  onClick={() => onSelectCourse(course)}
                  variant={isEnrolled ? 'secondary' : 'primary'}
                  size="small"
                >
                  {isEnrolled ? 'View Course' : 'Enroll Now'}
                </Button>
              </div>

              {isEnrolled && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>60%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No courses found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default StudentCourses;