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
    const payload = await response.json();
    if (typeof payload?.error === 'string') {
      return payload.error;
    }
  } catch {
    return response.statusText || 'Request failed.';
  }

  return response.statusText || 'Request failed.';
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(resolveUrl(path), {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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
};