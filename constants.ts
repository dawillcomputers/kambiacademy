
import { Course, User, CourseLevel, Quiz, Submission, Enrollment, CourseStatus, Message, Report, Expense, Testimonial } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', role: 'student', status: 'active', created_at: '2024-01-15T10:00:00Z', enrolledCourses: ['c1', 'c3'] },
  { id: 'u2', name: 'Bob Williams', email: 'bob@example.com', role: 'student', status: 'active', created_at: '2024-01-20T10:00:00Z', enrolledCourses: ['c2'] },
  { id: 'u3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'student', status: 'active', created_at: '2024-02-01T10:00:00Z', enrolledCourses: ['c1', 'c2', 'c3'] },
  { id: 't1', name: 'Dr. Evelyn Reed', email: 'evelyn.reed@kambi.edu', role: 'teacher', status: 'active', created_at: '2024-01-01T10:00:00Z', earnings: { total: 0, paidOut: 0, pending: 0 }, tin: '123-456-789', bio: 'A passionate educator with 10+ years of experience in web technologies and user experience design.', kycStatus: 'verified', bvn: '12345678901', nin: '12345678901', utilityBillUrl: 'utility-bill.jpg', bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Dr. Evelyn Reed' },
  { id: 't2', name: 'John Doe', email: 'john.doe@kambi.edu', role: 'teacher', status: 'active', created_at: '2024-02-01T10:00:00Z', earnings: { total: 0, paidOut: 0, pending: 0 }, bio: 'An instructor pending KYC verification.', kycStatus: 'pending', bvn: '22345678901', nin: '22345678901', utilityBillUrl: 'utility-bill.pdf', bankName: 'First Bank', accountNumber: '0987654321', accountName: 'John Doe' },
  { id: 'a1', name: 'Sam Administrator', email: 'admin@kambi.edu', role: 'admin', status: 'active', created_at: '2023-01-01T10:00:00Z', bvn: '', nin: '', utilityBillUrl: '', bankName: '', accountNumber: '', accountName: '' },
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    slug: 'web-dev-intro',
    title: 'Introduction to Web Development',
    summary: 'Learn HTML, CSS, and JavaScript basics',
    description: 'Learn the fundamentals of HTML, CSS, and JavaScript to build your first websites. No prior experience needed!',
    level: 'Foundation',
    durationLabel: '8 weeks',
    priceLabel: '$49.99',
    deliveryMode: 'Live',
    cohortSize: '25 students',
    category: 'Web Development',
    tone: 'indigo' as any,
    instructorId: 't1',
    featured: true,
    outcomes: ['Build HTML pages', 'Style with CSS', 'Add interactivity with JavaScript'],
    modules: [
      { title: 'HTML Basics', summary: 'Learn HTML fundamentals', lengthLabel: '2 weeks' },
      { title: 'CSS Styling', summary: 'Master CSS styling', lengthLabel: '2 weeks' }
    ],
    status: CourseStatus.Approved,
    instructor: 'Dr. Evelyn Reed',
    price: 49.99,
    imageUrl: 'https://picsum.photos/seed/webdev/600/400',
    assignments: [
      { id: 'a1', courseId: 'c1', title: 'Create your first HTML page', description: 'Submit a simple HTML file', dueDate: '2024-08-15', maxScore: 100 },
    ],
  },
  {
    id: 'c2',
    slug: 'react-advanced',
    title: 'Advanced React and TypeScript',
    summary: 'Master React with TypeScript',
    description: 'Dive deep into modern React concepts like Hooks, Context, and state management.',
    level: 'Advanced',
    durationLabel: '10 weeks',
    priceLabel: '$99.99',
    deliveryMode: 'Live',
    cohortSize: '20 students',
    category: 'Web Development',
    tone: 'teal' as any,
    instructorId: 't1',
    featured: false,
    outcomes: ['Master React Hooks', 'Use TypeScript effectively', 'State management patterns'],
    modules: [
      { title: 'React Hooks', summary: 'Advanced hooks patterns', lengthLabel: '3 weeks' }
    ],
    status: CourseStatus.Approved,
    instructor: 'Dr. Evelyn Reed',
    price: 99.99,
    imageUrl: 'https://picsum.photos/seed/react/600/400',
    assignments: [],
  },
  {
    id: 'c3',
    slug: 'uiux-fundamentals',
    title: 'UI/UX Design Fundamentals',
    summary: 'Learn design principles and processes',
    description: 'Explore the principles of user interface and user experience design.',
    level: 'Intermediate',
    durationLabel: '8 weeks',
    priceLabel: '$79.99',
    deliveryMode: 'Live',
    cohortSize: '30 students',
    category: 'Design',
    tone: 'amber' as any,
    instructorId: 't1',
    featured: false,
    outcomes: ['Design principles', 'Figma proficiency', 'User research basics'],
    modules: [
      { title: 'Design Principles', summary: 'Core design theory', lengthLabel: '2 weeks' }
    ],
    status: CourseStatus.Approved,
    instructor: 'Dr. Evelyn Reed',
    price: 79.99,
    imageUrl: 'https://picsum.photos/seed/uiux/600/400',
    assignments: [
      { id: 'a3', courseId: 'c3', title: 'Design a mobile app prototype', description: 'Figma prototype', dueDate: '2024-08-20', maxScore: 100 },
    ],
  },
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
    { id: 'e1', userId: 'u1', courseId: 'c3', progress: 75, status: 'active', enrolledAt: new Date('2024-07-10T10:00:00Z').toISOString(), amountPaid: 79.99, platformFee: 23.99 },
    { id: 'e2', userId: 'u2', courseId: 'c2', progress: 50, status: 'active', enrolledAt: new Date('2024-07-11T11:30:00Z').toISOString(), amountPaid: 99.99, platformFee: 29.99 },
    { id: 'e3', userId: 'u3', courseId: 'c1', progress: 90, status: 'completed', enrolledAt: new Date('2024-07-12T14:00:00Z').toISOString(), amountPaid: 49.99, platformFee: 14.99, completedAt: new Date('2024-08-10T14:00:00Z').toISOString() }
];

export const MOCK_TESTIMONIALS: Testimonial[] = [
    { id: 'tst1', name: 'Alice Johnson', course: 'Web Development', quote: 'The hands-on projects were fantastic! I went from zero knowledge to building my own website. Highly recommended!', avatar: 'https://i.pravatar.cc/150?u=u1' },
    { id: 'tst2', name: 'Charlie Brown', course: 'UI/UX Design', quote: 'An amazing learning experience. The instructor was engaging, and the community was incredibly supportive.', avatar: 'https://i.pravatar.cc/150?u=u3' },
    { id: 'tst3', name: 'Bob Williams', course: 'Advanced React', quote: 'This course took my React skills to the next level. The content is up-to-date and dives deep into complex topics.', avatar: 'https://i.pravatar.cc/150?u=u2' },
];

// Initialize teacher earnings based on mock enrollments for approved courses
MOCK_USERS.forEach(user => {
    if (user.role === 'teacher' && user.earnings) {
        const teacherCourses = MOCK_COURSES.filter(c => c.instructorId === user.id && c.status === CourseStatus.Approved);
        let totalEarnings = 0;
        teacherCourses.forEach(course => {
            const courseEnrollments = MOCK_ENROLLMENTS.filter(e => e.courseId === course.id);
            // Calculate teacher share (typically 70% of amount paid)
            courseEnrollments.forEach(enrollment => {
                totalEarnings += enrollment.amountPaid * 0.7;
            });
        });
        user.earnings.total = totalEarnings;
    }
});


export const MOCK_SUBMISSIONS: Submission[] = [
    { id: 's1', assignmentId: 'a3', studentId: 'u1', submittedAt: '2024-08-18', content: 'https://figma.com/project/link', grade: 'A-' },
    { id: 's2', assignmentId: 'a1', studentId: 'u3', submittedAt: '2024-08-14', content: '/path/to/charlie_submission.html', grade: null },
    { id: 's3', assignmentId: 'a4', studentId: 'u1', submittedAt: '2024-08-22', content: '.container {\n  display: flex;\n  justify-content: center;\n}\n.item {\n  flex-grow: 1;\n}', grade: 'B+' },
    { id: 's4', assignmentId: 'a1', studentId: 'u1', submittedAt: '2024-08-15', content: '/path/to/alice_page.zip', grade: null },
];

export const MOCK_QUIZZES: Quiz[] = [
    {
        id: 'quiz1',
        courseId: 'c1',
        title: 'HTML Fundamentals Quiz',
        questions: [
            { id: 'q1_1', text: 'What does HTML stand for?', options: ['Hyper Trainer Marking Language', 'Hyper Text Marketing Language', 'Hyper Text Markup Language', 'Hyperlink and Text Markup Language'], correctAnswer: 'Hyper Text Markup Language' },
            { id: 'q1_2', text: 'Which HTML tag is used to define an internal style sheet?', options: ['<script>', '<css>', '<style>', '<link>'], correctAnswer: '<style>' },
            { id: 'q1_3', text: 'What is the correct HTML element for inserting a line break?', options: ['<lb>', '<break>', '<br>', '<ln>'], correctAnswer: '<br>' },
        ]
    },
    {
        id: 'quiz2',
        courseId: 'c3',
        title: 'Basic UI/UX Principles',
        questions: [
            { id: 'q2_1', text: 'What is a wireframe?', options: ['A final design of a website', 'A low-fidelity layout diagram', 'A type of user persona', 'A color palette'], correctAnswer: 'A low-fidelity layout diagram' },
            { id: 'q2_2', text: 'Which of these is a primary goal of UX design?', options: ['To make the product look beautiful', 'To ensure the product is useful and easy to use', 'To write clean code for the product', 'To market the product effectively'], correctAnswer: 'To ensure the product is useful and easy to use' },
        ]
    }
];

export const MOCK_MESSAGES: Message[] = [
    { id: 'msg1', senderId: 'u1', receiverId: 't1', text: 'Hi Dr. Reed, I have a question about the flexbox assignment.', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'msg2', senderId: 't1', receiverId: 'u1', text: 'Of course, Alice. What are you having trouble with?', timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString() },
    { id: 'msg3', senderId: 'u2', receiverId: 'a1', text: 'Hello, I have a billing question.', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
];

export const MOCK_REPORTS: Report[] = [
    { id: 'rep1', reporterId: 'u3', reportedTeacherId: 't1', courseId: 'c2', reason: 'The instructor was unresponsive to questions in the Q&A forum.', status: 'open', createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() }
];

export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp1', description: 'Server Hosting - July', amount: 150.00, date: new Date('2024-07-01T09:00:00Z').toISOString() },
    { id: 'exp2', description: 'Marketing Campaign Q3', amount: 500.00, date: new Date('2024-07-05T14:00:00Z').toISOString() },
];

// Added MOCK_QNA for the Qna component
export const MOCK_MATERIALS: Material[] = [
    { id: 'm1', courseId: 'c1', title: 'HTML Basics Guide', description: 'Complete guide to HTML fundamentals', type: 'pdf' as const, url: '/materials/html-basics.pdf', uploadedAt: new Date('2024-07-01T10:00:00Z').toISOString() },
    { id: 'm2', courseId: 'c1', title: 'CSS Styling Tutorial', description: 'Learn CSS styling techniques', type: 'video' as const, url: 'https://example.com/css-tutorial.mp4', uploadedAt: new Date('2024-07-05T10:00:00Z').toISOString() },
    { id: 'm3', courseId: 'c1', title: 'JavaScript Cheat Sheet', description: 'Quick reference for JavaScript syntax', type: 'link' as const, url: 'https://example.com/js-cheatsheet', uploadedAt: new Date('2024-07-10T10:00:00Z').toISOString() },
    { id: 'm4', courseId: 'c3', title: 'UI/UX Design Principles', description: 'Core principles of user interface design', type: 'pdf' as const, url: '/materials/ui-ux-principles.pdf', uploadedAt: new Date('2024-07-15T10:00:00Z').toISOString() },
    { id: 'm5', courseId: 'c3', title: 'Figma Tutorial Video', description: 'Learn Figma for UI design', type: 'video' as const, url: 'https://example.com/figma-tutorial.mp4', uploadedAt: new Date('2024-07-20T10:00:00Z').toISOString() },
];
