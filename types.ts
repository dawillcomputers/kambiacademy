
export type CourseLevel = 'Foundation' | 'Intermediate' | 'Advanced';

export type CourseTone = 'indigo' | 'teal' | 'amber' | 'rose';

export type SessionStatus = 'open' | 'upcoming';

export enum CourseStatus {
  Approved = 'Approved',
  Pending = 'Pending',
  Rejected = 'Rejected'
}

export type View = 'messages' | 'liveClassroom' | 'overview' | 'progress';

export interface CallToAction {
  label: string;
  href: string;
  external?: boolean;
}

export interface BrandingContent {
  name: string;
  strapline: string;
  primaryCta: CallToAction;
  secondaryCta: CallToAction;
}

export interface HeroContent {
  eyebrow: string;
  headline: string;
  description: string;
  highlights: string[];
  primaryCta: CallToAction;
  secondaryCta: CallToAction;
}

export interface Stat {
  label: string;
  value: string;
  detail: string;
}

export interface Principle {
  title: string;
  description: string;
}

export interface AboutContent {
  headline: string;
  narrative: string;
  principles: Principle[];
  videoUrl?: string;
  videoThumbnail?: string;
  videoDescription?: string;
}

export interface ContactContent {
  headline: string;
  description: string;
  responseTime: string;
  primaryEmail: string;
  partnerEmail: string;
  location: string;
  hours: string;
}

export interface TutorBenefit {
  title: string;
  description: string;
}

export interface TutorProgramContent {
  headline: string;
  description: string;
  benefits: TutorBenefit[];
  reviewSteps: string[];
}

export interface MeetFeature {
  title: string;
  description: string;
}

export interface MeetContent {
  name: string;
  headline: string;
  description: string;
  features: MeetFeature[];
}

export interface Instructor {
  id: string;
  name: string;
  role: string;
  headline: string;
  bio: string;
  expertise: string[];
  yearsExperience: number;
  colorToken: CourseTone;
  featured: boolean;
}

export interface CourseModule {
  title: string;
  summary: string;
  lengthLabel: string;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  level: CourseLevel;
  durationLabel: string;
  priceLabel: string;
  deliveryMode: string;
  cohortSize: string;
  category: string;
  tone: CourseTone;
  instructorId: string;
  featured: boolean;
  outcomes: string[];
  modules: CourseModule[];
  syllabusUrl?: string | null;
  // Dashboard properties
  price: number;
  status?: CourseStatus;
  instructor?: string;
  imageUrl?: string;
  assignments?: Assignment[];
  materials?: Material[];
  liveClassLinks?: LiveClassLink[];
  announcements?: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  course: string;
  quote: string;
  avatar?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface MeetSession {
  id: string;
  title: string;
  courseSlug: string | null;
  hostName: string;
  hostRole: string;
  startsAt: string;
  durationMinutes: number;
  timezone: string;
  status: SessionStatus;
  joinUrl: string;
  agenda: string;
  seatLabel: string;
  platformLabel: string;
}

export interface SiteData {
  branding: BrandingContent;
  hero: HeroContent;
  stats: Stat[];
  about: AboutContent;
  contact: ContactContent;
  tutorProgram: TutorProgramContent;
  meet: MeetContent;
  instructors: Instructor[];
  courses: Course[];
  testimonials: Testimonial[];
  faqs: FaqItem[];
  sessions: MeetSession[];
}

export interface ContactSubmissionPayload {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
}

export interface CourseInquiryPayload {
  name: string;
  email: string;
  organization: string;
  courseSlug: string;
  goals: string;
  startWindow: string;
}

export interface TutorApplicationPayload {
  name: string;
  email: string;
  phone: string;
  expertise: string;
  yearsExperience: string;
  portfolioUrl: string;
  summary: string;
  resume?: File | null;
}

export interface SubmissionResult {
  id: string;
  message: string;
}

// Dashboard and core domain types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'super_admin';
  status: 'active' | 'pending' | 'suspended';
  kycStatus?: 'verified' | 'pending' | 'rejected' | 'unverified';
  enrolledCourses?: string[];
  earnings?: { paidOut: number; pending: number; total?: number };
  bvn?: string;
  nin?: string;
  tin?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  utilityBillUrl?: string;
  bio?: string;
  created_at: string;
  updated_at?: string;
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  timeLimit?: number;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  grade?: number | null;
  feedback?: string;
  content?: string;
  submittedAt?: string;
  score?: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  dueDate: string;
  maxScore?: number;
  type?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  status: 'active' | 'completed' | 'dropped';
  enrolledAt: string;
  completedAt?: string;
  amountPaid: number;
  platformFee: number;
  user_name?: string;
  user_email?: string;
  course_slug?: string;
  created_at?: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedTeacherId: string;
  courseId: string;
  reason: string;
  status: 'open' | 'closed' | 'resolved';
  createdAt?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface AppSettings {
  moneyBackGuaranteeDays: number;
  [key: string]: any;
}

export interface Material {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  type: 'video' | 'pdf' | 'link' | 'text';
  url?: string;
  uploadedAt?: string;
}

export interface LiveClassLink {
  id: string;
  courseId: string;
  title: string;
  meetingLink: string;
  scheduledAt?: string;
}

export interface BrandingSettings {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}
