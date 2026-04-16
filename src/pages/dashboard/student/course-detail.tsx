import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Course } from '../../../../types';
import { AuthUser } from '../../../../lib/auth';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface StudentCourseDetailProps {
  user: AuthUser;
  courses: Course[];
  onSelectCourse: (course: Course) => void;
}

const StudentCourseDetail: React.FC<StudentCourseDetailProps> = ({ user, courses, onSelectCourse }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courses.find((item) => item.id === courseId);
  const isEnrolled = course && user.enrolledCourses?.includes(course.id);

  if (!course) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <h2 className="text-2xl font-semibold mb-3">Course not found</h2>
        <p className="text-gray-600 mb-6">The course could not be located. Please return to your course list.</p>
        <Link to="/student/courses" className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
          Back to courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              <div className="text-sm text-gray-500">{course.category}</div>
              <h1 className="text-3xl font-bold">{course.title}</h1>
              <p className="text-slate-900">{course.summary}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Level</span>
                <p className="mt-2 font-semibold text-slate-900">{course.level}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Duration</span>
                <p className="mt-2 font-semibold text-slate-900">{course.durationLabel}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <span className="text-sm text-slate-500">Price</span>
                <p className="mt-2 font-semibold text-slate-900">{course.priceLabel}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">What you'll learn</h2>
                <ul className="mt-4 space-y-2 text-slate-900">
                  {course.outcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-1 text-green-600">•</span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900">Course modules</h2>
                <div className="mt-4 space-y-3">
                  {course.modules.map((module, index) => (
                    <div key={index} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold text-slate-900">{module.title}</p>
                        <span className="text-sm text-slate-500">{module.lengthLabel}</span>
                      </div>
                      <p className="mt-2 text-slate-900">{module.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div>
            <div className="text-sm text-gray-500">Instructor</div>
            <p className="mt-2 font-semibold text-slate-900">{course.instructor || 'Kambi Academy'}</p>
          </div>

          <div>
            <div className="text-sm text-gray-500">Class size</div>
            <p className="mt-2 font-semibold text-slate-900">{course.cohortSize}</p>
          </div>

          <div>
            <div className="text-sm text-gray-500">Course status</div>
            <p className="mt-2 font-semibold text-slate-900">{isEnrolled ? 'Enrolled' : 'Open to enroll'}</p>
          </div>

          <Button onClick={() => onSelectCourse(course)}>
            {isEnrolled ? 'Continue Learning' : course.price === 0 ? 'Proceed to course' : 'Enroll in this course'}
          </Button>

          <Link to="/student/courses" className="block text-center text-sm text-blue-600 underline">
            Back to all courses
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default StudentCourseDetail;
