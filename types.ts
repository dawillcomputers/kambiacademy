
export type CourseLevel = 'Foundation' | 'Intermediate' | 'Advanced';

export type CourseTone = 'indigo' | 'teal' | 'amber' | 'rose';

export type SessionStatus = 'open' | 'upcoming';

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
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  organization: string;
  quote: string;
  courseSlug: string;
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
