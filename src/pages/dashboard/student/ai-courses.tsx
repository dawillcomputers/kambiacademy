import React, { useState } from 'react';
import { Course } from '../../../../types';
import Card from '../../../../components/Card';
import Button from '../../../../components/Button';

interface AICourse {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  modules: string[];
  estimatedDuration: string;
  price: number;
  isLocked: boolean;
}

interface AICoursesProps {
  onRequestPayment?: (course: Course) => void;
}

const AICourses: React.FC<AICoursesProps> = ({ onRequestPayment }) => {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<AICourse | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);

    // Simulate AI generation
    setTimeout(() => {
      const mockCourse: AICourse = {
        id: `ai-${Date.now()}`,
        title: `${topic} Mastery`,
        description: `A comprehensive course on ${topic.toLowerCase()} designed specifically for ${level.toLowerCase()} learners.`,
        level,
        modules: [
          `Introduction to ${topic}`,
          `Core Concepts and Fundamentals`,
          `Practical Applications`,
          `Advanced Techniques`,
          `Projects and Case Studies`,
          `Final Assessment`
        ],
        estimatedDuration: level === 'Beginner' ? '4 weeks' : level === 'Intermediate' ? '6 weeks' : '8 weeks',
        price: level === 'Beginner' ? 2500 : level === 'Intermediate' ? 4000 : 6000,
        isLocked: true
      };

      setGeneratedCourse(mockCourse);
      setIsGenerating(false);
    }, 2000);
  };

  const createCourseFromPopular = (course: { title: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; price: number }) => {
    const slug = `ai-${course.title.toLowerCase().replace(/\s+/g, '-')}`;
    const levelLabel = course.level === 'Beginner' ? 'Foundation' : course.level;

    return {
      id: slug,
      slug,
      title: course.title,
      summary: `A practical ${course.title} course designed by Kambi AI.`,
      description: `Learn ${course.title} with an AI-crafted curriculum that includes modules, assessments, and real-world examples.`,
      level: levelLabel,
      durationLabel: course.level === 'Beginner' ? '4 weeks' : course.level === 'Intermediate' ? '6 weeks' : '8 weeks',
      priceLabel: `₦${course.price.toLocaleString()}`,
      deliveryMode: 'AI generated',
      cohortSize: 'Self-paced',
      category: 'AI Course',
      tone: 'indigo',
      instructorId: 'ai-bot',
      featured: false,
      outcomes: [
        `Build practical ${course.title} skills`,
        `Complete hands-on projects with AI guidance`,
        `Earn a strong foundation in ${course.title}`
      ],
      tags: ['AI'],
      modules: [
        { title: 'Introduction', summary: 'Get started with the fundamentals.', lengthLabel: '1 week' },
        { title: 'Core concepts', summary: 'Master the essential ideas and workflows.', lengthLabel: '2 weeks' },
        { title: 'Practical application', summary: 'Apply your learning to real examples.', lengthLabel: '2 weeks' }
      ],
      price: course.price,
      instructor: 'Kambi AI',
      imageUrl: `https://picsum.photos/seed/${slug}/600/400`,
      assignments: [],
      materials: [],
      liveClassLinks: [],
      announcements: []
    } as Course;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-white">🤖 AI Course Generator</h1>
        <p className="text-white">Create personalized courses tailored to your learning needs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-6 text-slate-900">Create Your Course</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., React, Python, Data Science"
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Skill Level
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                What do you want to learn?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your learning goals, specific areas of interest, or any prerequisites..."
                rows={4}
                className="w-full px-3 py-2 text-black border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!topic.trim() || isGenerating}
              className="w-full"
            >
              {isGenerating ? 'Generating Course...' : 'Generate Course'}
            </Button>
          </div>
        </Card>

        {/* Generated Course Preview */}
        <div className="space-y-6">
          {generatedCourse ? (
            <Card className={`p-6 ${generatedCourse.isLocked ? 'bg-gray-50 border-gray-200' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">{generatedCourse.title}</h2>
                {generatedCourse.isLocked && (
                  <span className="px-2 py-1 bg-gray-200 text-slate-900 text-xs rounded-full">
                    🔒 Locked
                  </span>
                )}
              </div>

              <p className="text-slate-900 mb-4">{generatedCourse.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm text-slate-900">Level</span>
                  <p className="font-medium text-slate-900">{generatedCourse.level}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-900">Duration</span>
                  <p className="font-medium text-slate-900">{generatedCourse.estimatedDuration}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-slate-900">Course Modules</h3>
                <ul className="space-y-2">
                  {generatedCourse.modules.map((module, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-slate-900">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      {module}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-green-600">
                  ₦{generatedCourse.price.toLocaleString()}
                </span>
                <Button
                  variant={generatedCourse.isLocked ? 'primary' : 'secondary'}
                  disabled={!generatedCourse.isLocked}
                  onClick={() => {
                    if (!generatedCourse.isLocked) return;

                    const course: Course = {
                      id: generatedCourse.id,
                      slug: `ai-${topic.toLowerCase().replace(/\s+/g, '-')}`,
                      title: generatedCourse.title,
                      summary: generatedCourse.description,
                      description: generatedCourse.description,
                      level: generatedCourse.level,
                      durationLabel: generatedCourse.estimatedDuration,
                      priceLabel: `₦${generatedCourse.price.toLocaleString()}`,
                      deliveryMode: 'AI generated',
                      cohortSize: 'Self-paced',
                      category: 'AI Course',
                      tone: 'indigo',
                      instructorId: 'ai-bot',
                      featured: false,
                      outcomes: [],
                      tags: ['AI'],
                      modules: generatedCourse.modules.map((title) => ({ title, summary: '', lengthLabel: '' })),
                      price: generatedCourse.price,
                      instructor: 'Kambi AI',
                      imageUrl: 'https://picsum.photos/seed/ai-course/600/400',
                      assignments: [],
                    };

                    onRequestPayment?.(course);
                  }}
                >
                  {generatedCourse.isLocked ? 'Unlock Course' : 'Enrolled'}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center bg-gray-50">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-2 text-slate-900">AI Course Preview</h3>
              <p className="text-slate-900">
                Fill out the form to generate a personalized course curriculum
              </p>
            </Card>
          )}

          {/* Tips Card */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-slate-900 mb-3">💡 AI Course Tips</h3>
            <ul className="text-sm text-slate-900 space-y-2">
              <li>• Be specific about your learning goals</li>
              <li>• Mention any prerequisites or prior knowledge</li>
              <li>• Include practical projects you'd like to build</li>
              <li>• Specify your preferred learning pace</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Popular AI Generated Courses */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-slate-900">Popular AI Courses</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Machine Learning Fundamentals',
              level: 'Intermediate',
              price: 4500,
              enrolled: 234
            },
            {
              title: 'Advanced React Patterns',
              level: 'Advanced',
              price: 5500,
              enrolled: 189
            },
            {
              title: 'Python for Data Science',
              level: 'Beginner',
              price: 3500,
              enrolled: 456
            }
          ].map((course, index) => (
            <Card key={index} className="p-6">
              <h3 className="font-bold text-lg mb-2 text-slate-900">{course.title}</h3>
              <div className="flex justify-between items-center mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  course.level === 'Beginner' ? 'bg-green-100 text-green-800' :
                  course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {course.level}
                </span>
                <span className="text-sm text-gray-500">{course.enrolled} enrolled</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-green-600">₦{course.price.toLocaleString()}</span>
                <Button
                  size="small"
                  onClick={() => onRequestPayment?.(createCourseFromPopular(course))}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AICourses;