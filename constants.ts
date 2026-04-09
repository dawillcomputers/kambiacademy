
import { Course, User, CourseLevel, MaterialType, Quiz, Submission, Enrollment, CourseStatus, Message, Report, Expense, Testimonial } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', role: 'student', enrolledCourses: ['c1', 'c3'] },
  { id: 'u2', name: 'Bob Williams', email: 'bob@example.com', role: 'student', enrolledCourses: ['c2'] },
  { id: 'u3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'student', enrolledCourses: ['c1', 'c2', 'c3'] },
  { id: 't1', name: 'Dr. Evelyn Reed', email: 'evelyn.reed@kambi.edu', role: 'teacher', status: 'active', earnings: { total: 0, paidOut: 0 }, tin: '123-456-789', bio: 'A passionate educator with 10+ years of experience in web technologies and user experience design.', profileImageUrl: 'https://i.pravatar.cc/150?u=t1', kycStatus: 'verified', bvn: '12345678901', nin: '12345678901', utilityBillUrl: 'utility-bill.jpg', bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Dr. Evelyn Reed' },
  { id: 't2', name: 'John Doe', email: 'john.doe@kambi.edu', role: 'teacher', status: 'active', earnings: { total: 0, paidOut: 0 }, bio: 'An instructor pending KYC verification.', profileImageUrl: 'https://i.pravatar.cc/150?u=t2', kycStatus: 'pending', bvn: '22345678901', nin: '22345678901', utilityBillUrl: 'utility-bill.pdf', bankName: 'First Bank', accountNumber: '0987654321', accountName: 'John Doe' },
  { id: 'a1', name: 'Sam Administrator', email: 'admin@kambi.edu', role: 'admin', bvn: '', nin: '', utilityBillUrl: '', bankName: '', accountNumber: '', accountName: '' },
];

export const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Introduction to Web Development',
    description: 'Learn the fundamentals of HTML, CSS, and JavaScript to build your first websites. No prior experience needed!',
    level: CourseLevel.Beginner,
    status: CourseStatus.Approved,
    instructorId: 't1',
    instructor: 'Dr. Evelyn Reed',
    imageUrl: 'https://picsum.photos/seed/webdev/600/400',
    price: 49.99,
    materials: [
      { id: 'm1', title: 'Syllabus', type: MaterialType.Word, url: '#' },
      { id: 'm2', title: 'Week 1: HTML Basics', type: MaterialType.PowerPoint, url: '#' },
      { id: 'm3', title: 'Intro to CSS', type: MaterialType.Video, url: '#' },
      { id: 'm8', title: 'Flexbox vs. Grid Explained', type: MaterialType.YouTube, url: 'https://www.youtube.com/embed/k32voqQhODc' }
    ],
    assignments: [
      { id: 'a1', courseId: 'c1', title: 'Create your first HTML page', description: 'Submit a zip file containing an HTML file and a CSS file.', dueDate: '2024-08-15', type: 'file' },
      { id: 'a4', courseId: 'c1', title: 'CSS Flexbox Practice', description: 'Create a responsive layout using Flexbox. Submit your CSS code.', dueDate: '2024-08-25', type: 'text' },
    ],
    liveClassLinks: [
      { platform: 'Zoom', url: 'https://zoom.us/j/1234567890', time: 'Every Monday at 3:00 PM EST' },
      { platform: 'Google Classroom', url: 'https://classroom.google.com', time: 'Office Hours: Wednesdays 5-6 PM EST' },
    ],
    announcements: [
        { id: 'ann1', text: 'Welcome to the course! Please review the syllabus and introduce yourself in the forum.', timestamp: '2 weeks ago' }
    ],
  },
  {
    id: 'c2',
    title: 'Advanced React and TypeScript',
    description: 'Dive deep into modern React concepts like Hooks, Context, and state management, all with the power of TypeScript.',
    level: CourseLevel.Advanced,
    status: CourseStatus.Approved,
    instructorId: 't1',
    instructor: 'Dr. Evelyn Reed',
    imageUrl: 'https://picsum.photos/seed/react/600/400',
    price: 99.99,
    materials: [
      { id: 'm4', title: 'Advanced Hooks Guide', type: MaterialType.GoogleSlides, url: '#' },
      { id: 'm5', title: 'State Management Patterns', type: MaterialType.Video, url: '#' },
    ],
    assignments: [
      { id: 'a2', courseId: 'c2', title: 'Build a typed shopping cart app', description: 'Submit the link to your GitHub repository.', dueDate: '2024-09-01', type: 'file' },
    ],
    liveClassLinks: [
      { platform: 'Google Meet', url: 'https://meet.google.com/lookup/random-code', time: 'Every Tuesday at 6:00 PM EST' },
    ],
    announcements: [],
  },
  {
    id: 'c3',
    title: 'UI/UX Design Fundamentals',
    description: 'Explore the principles of user interface and user experience design to create intuitive and beautiful applications.',
    level: CourseLevel.Intermediate,
    status: CourseStatus.Approved,
    instructorId: 't1',
    instructor: 'Dr. Evelyn Reed',
    imageUrl: 'https://picsum.photos/seed/uiux/600/400',
    price: 79.99,
    materials: [
      { id: 'm6', title: 'Color Theory', type: MaterialType.PowerPoint, url: '#' },
      { id: 'm7', title: 'Prototyping with Figma', type: MaterialType.Video, url: '#' },
    ],
    assignments: [
      { id: 'a3', courseId: 'c3', title: 'Design a mobile app prototype', description: 'Submit a link to your Figma project.', dueDate: '2024-08-20', type: 'file' },
    ],
    liveClassLinks: [
      { platform: 'Zoom', url: 'https://zoom.us/j/0987654321', time: 'Every Thursday at 1:00 PM EST' },
    ],
    announcements: [],
  },
   {
    id: 'c4',
    title: 'Introduction to Python for Data Science',
    description: 'A beginner-friendly course on Python programming, focusing on libraries like NumPy and Pandas for data analysis.',
    level: CourseLevel.Beginner,
    status: CourseStatus.Pending,
    instructorId: 't1',
    instructor: 'Dr. Evelyn Reed',
    imageUrl: 'https://picsum.photos/seed/python/600/400',
    price: 69.99,
    materials: [],
    assignments: [],
    liveClassLinks: [],
    announcements: [],
  },
];

export const MOCK_ENROLLMENTS: Enrollment[] = [
    { id: 'e1', studentId: 'u1', courseId: 'c3', amountPaid: 79.99, platformFee: 23.99, teacherShare: 56.00, timestamp: new Date('2024-07-10T10:00:00Z').toISOString() },
    { id: 'e2', studentId: 'u2', courseId: 'c2', amountPaid: 99.99, platformFee: 29.99, teacherShare: 70.00, timestamp: new Date('2024-07-11T11:30:00Z').toISOString() },
    { id: 'e3', studentId: 'u3', courseId: 'c1', amountPaid: 49.99, platformFee: 14.99, teacherShare: 35.00, timestamp: new Date('2024-07-12T14:00:00Z').toISOString() }
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
            courseEnrollments.forEach(enrollment => {
                totalEarnings += enrollment.teacherShare;
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
    { id: 'msg1', senderId: 'u1', receiverId: 't1', text: 'Hi Dr. Reed, I have a question about the flexbox assignment.', timestamp: '1 day ago', read: true },
    { id: 'msg2', senderId: 't1', receiverId: 'u1', text: 'Of course, Alice. What are you having trouble with?', timestamp: '23 hours ago', read: false },
    { id: 'msg3', senderId: 'u2', receiverId: 'a1', text: 'Hello, I have a billing question.', timestamp: '3 hours ago', read: false },
];

export const MOCK_REPORTS: Report[] = [
    { id: 'rep1', reporterId: 'u3', reportedTeacherId: 't1', courseId: 'c2', reason: 'The instructor was unresponsive to questions in the Q&A forum.', timestamp: '4 days ago', status: 'open' }
];

export const MOCK_EXPENSES: Expense[] = [
    { id: 'exp1', description: 'Server Hosting - July', amount: 150.00, date: new Date('2024-07-01T09:00:00Z').toISOString() },
    { id: 'exp2', description: 'Marketing Campaign Q3', amount: 500.00, date: new Date('2024-07-05T14:00:00Z').toISOString() },
];

// Added MOCK_QNA for the Qna component
export const MOCK_QNA = [
    {
        id: 'q1',
        author: MOCK_USERS[0],
        question: 'What is the difference between let and const in JavaScript?',
        timestamp: '2 hours ago',
        answers: [
            {
                id: 'a1',
                author: MOCK_USERS[3], // Dr. Evelyn Reed
                timestamp: '1 hour ago',
                text: 'let allows you to reassign a value to a variable, while const (short for constant) prevents reassignment after the initial value is set. However, for objects and arrays declared with const, the properties or elements can still be modified.'
            }
        ]
    },
    {
        id: 'q2',
        author: MOCK_USERS[1],
        question: 'How do I center a div using Flexbox?',
        timestamp: '5 hours ago',
        answers: [
            {
                id: 'a2',
                author: MOCK_USERS[0],
                timestamp: '4 hours ago',
                text: 'You can use display: flex; justify-content: center; align-items: center; on the parent container.'
            }
        ]
    }
];
