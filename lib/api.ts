import {
  ContactSubmissionPayload,
  CourseInquiryPayload,
  SiteData,
  SubmissionResult,
  TutorApplicationPayload,
} from '../types';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const resolveUrl = (path: string) => `${apiBaseUrl}${path}`;

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as any;
    if (typeof payload?.error === 'string') {
      return payload.error;
    }
  } catch {
    return response.statusText || 'Request failed.';
  }

  return response.statusText || 'Request failed.';
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(resolveUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json() as Promise<T>;
};

export const api = {
  getSite: () => request<SiteData>('/api/site'),

  submitContact: (payload: ContactSubmissionPayload) =>
    request<SubmissionResult>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitCourseInquiry: (payload: CourseInquiryPayload) =>
    request<SubmissionResult>('/api/course-inquiries', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitTutorApplication: async (payload: TutorApplicationPayload) => {
    const body = new FormData();
    body.set('name', payload.name);
    body.set('email', payload.email);
    body.set('phone', payload.phone);
    body.set('expertise', payload.expertise);
    body.set('yearsExperience', payload.yearsExperience);
    body.set('portfolioUrl', payload.portfolioUrl);
    body.set('summary', payload.summary);

    if (payload.resume) {
      body.set('resume', payload.resume);
    }

    return request<SubmissionResult>('/api/tutor-applications', {
      method: 'POST',
      body,
    });
  },

  enroll: (courseSlug: string) =>
    request<{ message: string }>('/api/enroll', {
      method: 'POST',
      body: JSON.stringify({ courseSlug }),
    }),

  getEnrollments: () =>
    request<{ enrollments: Array<{ course_slug: string; amount_paid: number; created_at: string }> }>('/api/enrollments'),

  getCourseStats: (slug: string) =>
    request<{ views: number; likes: number; userLiked: boolean }>(`/api/courses/${slug}/stats`),

  recordView: (slug: string) =>
    request<{ message: string }>(`/api/courses/${slug}/view`, { method: 'POST' }),

  toggleLike: (slug: string) =>
    request<{ liked: boolean }>(`/api/courses/${slug}/like`, { method: 'POST' }),

  // Admin
  adminGetStats: () => request<any>('/api/admin/stats'),

  adminGetUsers: () =>
    request<{ users: any[] }>('/api/admin/users'),

  adminManageUser: (userId: number, action: string, extra?: Record<string, any>) =>
    request<any>('/api/admin/users', {
      method: 'PATCH',
      body: JSON.stringify({ userId, action, ...extra }),
    }),

  adminGetCourses: () =>
    request<{ courses: any[] }>('/api/admin/courses'),

  adminManageCourse: (courseId: number, status: 'approved' | 'rejected', notes?: string) =>
    request<any>('/api/admin/courses', {
      method: 'PATCH',
      body: JSON.stringify({ courseId, status, notes }),
    }),

  adminGetSettings: () =>
    request<{ settings: Record<string, string> }>('/api/admin/settings'),

  adminUpdateSetting: (key: string, value: string) =>
    request<any>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ key, value }),
    }),

  adminGetComplaints: () =>
    request<{ complaints: any[] }>('/api/complaints'),

  adminUpdateComplaint: (complaintId: number | string, status: 'pending' | 'reviewed' | 'resolved', adminAction?: string) =>
    request<any>('/api/complaints', {
      method: 'PATCH',
      body: JSON.stringify({ complaint_id: complaintId, status, admin_action: adminAction }),
    }),

  getSettings: () =>
    request<{ settings: Record<string, string> }>('/api/settings'),

  // Tutor
  tutorGetCourses: () =>
    request<{ courses: any[] }>('/api/tutor/courses'),

  tutorCreateCourse: (data: { title: string; description: string; level?: string; price?: number; duration_label?: string; category?: string }) =>
    request<any>('/api/tutor/courses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  tutorGetClasses: () =>
    request<{ classes: any[] }>('/api/tutor/classes'),

  tutorCreateClass: (data: { title: string; description?: string; max_students?: number }) =>
    request<any>('/api/tutor/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Tutor subscriptions and billing
  getTeacherSubscription: () =>
    request<{ platform: any; liveClass: any }>('/api/subscriptions/current'),

  createTeacherSubscription: (planType: string, subscriptionType: 'platform' | 'liveClass' = 'platform', paymentGateway?: string) =>
    request<any>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planType, subscriptionType, paymentGateway }),
    }),

  getTeacherSubscriptionHistory: (subscriptionType: 'platform' | 'liveClass' = 'platform') =>
    request<any>(`/api/subscriptions/history?type=${subscriptionType}`),

  cancelTeacherSubscription: (subscriptionId: string, subscriptionType: 'platform' | 'liveClass' = 'platform') =>
    request<any>(`/api/subscriptions/${encodeURIComponent(subscriptionId)}/cancel?type=${subscriptionType}`, {
      method: 'PATCH',
    }),

  // Invite
  getInviteInfo: (code: string) =>
    request<{ class: any }>(`/api/invite/${encodeURIComponent(code)}`),

  joinClass: (code: string) =>
    request<any>(`/api/invite/${encodeURIComponent(code)}`, { method: 'POST' }),

  // Progress
  getProgress: (slug?: string) =>
    request<any>(slug ? `/api/progress?slug=${encodeURIComponent(slug)}` : '/api/progress'),

  saveProgress: (data: { course_slug: string; module_index?: number; section_id?: string; progress_pct?: number }) =>
    request<any>('/api/progress', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Auth
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  // Assignments
  getAssignments: (courseSlug?: string) =>
    request<{ assignments: any[] }>(courseSlug ? `/api/assignments?course=${encodeURIComponent(courseSlug)}` : '/api/assignments'),

  createAssignment: (data: { course_slug: string; title: string; description?: string; type?: string; due_date?: string; max_score?: number }) =>
    request<any>('/api/assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Submissions
  getSubmissions: (assignmentId?: number) =>
    request<{ submissions: any[] }>(assignmentId ? `/api/submissions?assignment_id=${assignmentId}` : '/api/submissions'),

  submitAssignment: (assignmentId: number, content?: string, file?: File) => {
    if (file) {
      const formData = new FormData();
      formData.set('assignment_id', String(assignmentId));
      if (content) formData.set('content', content);
      formData.set('file', file);
      const token = localStorage.getItem('auth_token');
      return fetch(`${apiBaseUrl}/api/submissions`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error((d as any).error || 'Submit failed');
        return d;
      });
    }
    return request<any>('/api/submissions', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: assignmentId, content }),
    });
  },

  gradeSubmission: (submissionId: number, score: number, feedback?: string) =>
    request<any>('/api/submissions', {
      method: 'PATCH',
      body: JSON.stringify({ submission_id: submissionId, score, feedback }),
    }),

  // Quizzes
  getQuizzes: (courseSlug?: string) =>
    request<{ quizzes: any[] }>(courseSlug ? `/api/quizzes?course=${encodeURIComponent(courseSlug)}` : '/api/quizzes'),

  getQuiz: (id: number) =>
    request<{ quiz: any; questions: any[] }>(`/api/quizzes?id=${id}`),

  createQuiz: (data: { course_slug: string; title: string; description?: string; time_limit_minutes?: number; questions: Array<{ question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_option: string; points?: number }> }) =>
    request<any>('/api/quizzes', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getQuizResponses: (quizId?: number) =>
    request<{ responses: any[] }>(quizId ? `/api/quiz-responses?quiz_id=${quizId}` : '/api/quiz-responses'),

  submitQuizResponse: (quizId: number, answers: Array<{ question_id: number; selected_option: string }>) =>
    request<any>('/api/quiz-responses', {
      method: 'POST',
      body: JSON.stringify({ quiz_id: quizId, answers }),
    }),

  // Materials
  getMaterials: (courseSlug?: string) =>
    request<{ materials: any[] }>(courseSlug ? `/api/materials?course=${encodeURIComponent(courseSlug)}` : '/api/materials'),

  uploadMaterial: (data: { course_slug: string; title: string; description?: string; type: 'file' | 'youtube'; youtube_url?: string; file?: File }) => {
    if (data.type === 'file' && data.file) {
      const formData = new FormData();
      formData.set('course_slug', data.course_slug);
      formData.set('title', data.title);
      if (data.description) formData.set('description', data.description);
      formData.set('type', 'file');
      formData.set('file', data.file);
      const token = localStorage.getItem('auth_token');
      return fetch(`${apiBaseUrl}/api/materials`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      }).then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error((d as any).error || 'Upload failed');
        return d;
      });
    }
    return request<any>('/api/materials', {
      method: 'POST',
      body: JSON.stringify({
        course_slug: data.course_slug,
        title: data.title,
        description: data.description,
        type: 'youtube',
        youtube_url: data.youtube_url,
      }),
    });
  },

  deleteMaterial: (id: number) =>
    request<any>(`/api/materials?id=${id}`, { method: 'DELETE' }),

  getMaterialDownloadUrl: (id: number) =>
    `${apiBaseUrl}/api/materials/download?id=${id}`,

  // Audit log
  getAuditLog: (userId?: number) =>
    request<{ log: any[] }>(userId ? `/api/admin/audit-log?user_id=${userId}` : '/api/admin/audit-log'),

  // Live sessions
  getLiveSessions: () =>
    request<{ sessions: any[] }>('/api/live-sessions'),

  getLiveSession: (id: number) =>
    request<{ session: any; participants: any[]; messages: any[] }>(`/api/live-sessions?id=${id}`),

  startLiveSession: (classId: number, title?: string) =>
    request<{ id: number; message: string }>('/api/live-sessions', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, title }),
    }),

  endLiveSession: (sessionId: number) =>
    request<{ message: string }>('/api/live-sessions', {
      method: 'PATCH',
      body: JSON.stringify({ session_id: sessionId }),
    }),

  getLiveMessages: (sessionId: number, afterId?: number) =>
    request<{ messages: any[] }>(`/api/live-messages?session_id=${sessionId}&after=${afterId || 0}`),

  sendLiveMessage: (sessionId: number, text: string) =>
    request<any>('/api/live-messages', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, text }),
    }),

  // Profile
  getProfile: () =>
    request<{ profile: { name: string; email: string; bio?: string; avatar_url?: string; country?: string; certificate_name?: string } }>('/api/profile'),

  updateProfile: (data: { name?: string; bio?: string; avatar_url?: string; country?: string; certificate_name?: string }) =>
    request<{ success: boolean }>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Revenue
  recordRevenue: (data: { course_id: string; teacher_id: number; base_amount: number; location_markup_percentage?: number; student_country?: string }) =>
    request<{ success: boolean; transaction_id: number; final_amount: number; platform_fee: number; teacher_payout: number }>('/api/revenue', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};