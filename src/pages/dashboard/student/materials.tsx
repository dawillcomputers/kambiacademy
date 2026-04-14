import React, { useState } from 'react';
import { User, Course, Material } from '../../../../types';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface StudentMaterialsProps {
  user: User;
  courses: Course[];
  materials: Material[];
}

const StudentMaterials: React.FC<StudentMaterialsProps> = ({ user, courses, materials }) => {
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  const enrolledCourses = courses.filter(c => user.enrolledCourses?.includes(c.id));
  const courseMaterials = materials.filter(m =>
    selectedCourse === 'all' || m.courseId === selectedCourse
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">My Study Materials</h1>
        <p className="text-gray-600">All your course notes, videos, and files in one place</p>
      </div>

      {/* Course Filter */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCourse('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              selectedCourse === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All My Courses
          </button>
          {enrolledCourses.map(course => (
            <button
              key={course.id}
              onClick={() => setSelectedCourse(course.id)}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedCourse === course.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {course.title}
            </button>
          ))}
        </div>
      </Card>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courseMaterials.map(material => {
          const course = courses.find(c => c.id === material.courseId);

          return (
            <Card key={material.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="text-3xl">
                  {material.type === 'video' ? '🎥' :
                   material.type === 'pdf' ? '📄' :
                   material.type === 'link' ? '🔗' : '📝'}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">{material.title}</h3>
                  {material.description && (
                    <p className="text-gray-600 text-sm mb-3">{material.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mb-4">
                    {course?.title} • {material.type.toUpperCase()}
                  </p>

                  <Button size="small" className="w-full">
                    {material.type === 'video' ? 'Watch Video' :
                     material.type === 'pdf' ? 'Download PDF' :
                     material.type === 'link' ? 'Open Link' : 'View Material'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {courseMaterials.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold mb-2">No Materials Available</h3>
          <p className="text-gray-600">
            {selectedCourse === 'all'
              ? "You haven't enrolled in any courses yet."
              : "No materials have been uploaded for this course yet."
            }
          </p>
        </div>
      )}

      {/* Quick Access */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">📹</div>
            <p className="text-sm font-medium">Video Lectures</p>
            <p className="text-xs text-gray-600">12 available</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">📄</div>
            <p className="text-sm font-medium">PDF Guides</p>
            <p className="text-xs text-gray-600">8 available</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🔗</div>
            <p className="text-sm font-medium">External Links</p>
            <p className="text-xs text-gray-600">15 available</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl mb-2">📝</div>
            <p className="text-sm font-medium">Text Notes</p>
            <p className="text-xs text-gray-600">6 available</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentMaterials;