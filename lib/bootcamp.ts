import { api } from './api';

export type BootcampStatus = 'open' | 'closed' | 'draft';

export interface Bootcamp {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  cover_image_url: string;
  category: string;
  status: BootcampStatus;
  price: number;
  start_date?: string | null;
  end_date?: string | null;
  manager_id?: number | null;
  manager_name?: string | null;
  manager_email?: string | null;
  enrollment_count?: number;
  enrolled?: boolean;
  created_at?: string;
}

export interface BootcampResource {
  id: number;
  bootcamp_id: number;
  title: string;
  description: string;
  type: 'link' | 'text' | 'announcement';
  url: string;
  content: string;
  created_at: string;
}

export interface CompetitionWinner {
  id?: number;
  name: string;
  image_url: string;
  prize: string;
  position?: number;
  note?: string;
}

export interface BootcampCompetition {
  id: number;
  bootcamp_id: number;
  bootcamp_title?: string;
  bootcamp_slug?: string;
  title: string;
  description: string;
  image_url: string;
  event_date?: string | null;
  published: boolean;
  winners: CompetitionWinner[];
  created_at: string;
}

export interface BootcampInput {
  id?: number;
  title?: string;
  slug?: string;
  tagline?: string;
  description?: string;
  cover_image_url?: string;
  category?: string;
  status?: BootcampStatus;
  price?: number;
  start_date?: string;
  end_date?: string;
  managerEmail?: string;
  action?: 'open' | 'close';
}

export interface CompetitionInput {
  id?: number;
  bootcamp_id?: number;
  title?: string;
  description?: string;
  image_url?: string;
  event_date?: string;
  published?: boolean;
  winners?: CompetitionWinner[];
}

export const bootcampApi = {
  // Public / participant listing
  list: () => api.get<{ bootcamps: Bootcamp[] }>('/api/bootcamps'),
  // Super admin: every bootcamp incl. drafts
  listAdmin: () => api.get<{ bootcamps: Bootcamp[] }>('/api/bootcamps?scope=admin'),
  // Manager: bootcamps assigned to the current user
  listManaged: () => api.get<{ bootcamps: Bootcamp[] }>('/api/bootcamps?scope=manage'),

  create: (input: BootcampInput) => api.post<{ id: number; slug: string }>('/api/bootcamps', input),
  update: (input: BootcampInput) => api.patch<{ message: string }>('/api/bootcamps', input),
  remove: (id: number) => api.del<{ message: string }>(`/api/bootcamps?id=${id}`),

  // Enrollments
  myEnrollments: () => api.get<{ bootcamps: Bootcamp[] }>('/api/bootcamps/enroll'),
  enroll: (slug: string) => api.post<{ message: string; slug: string; id: number }>('/api/bootcamps/enroll', { slug }),

  // Hub resources
  resources: (bootcampId: number) => api.get<{ resources: BootcampResource[] }>(`/api/bootcamps/resources?bootcamp=${bootcampId}`),
  addResource: (input: { bootcamp_id: number; title: string; description?: string; type?: string; url?: string; content?: string }) =>
    api.post<{ id: number }>('/api/bootcamps/resources', input),
  removeResource: (id: number) => api.del<{ message: string }>(`/api/bootcamps/resources?id=${id}`),

  // Competitions
  publicCompetitions: () => api.get<{ competitions: BootcampCompetition[] }>('/api/competitions'),
  competitions: (bootcampId: number) => api.get<{ competitions: BootcampCompetition[] }>(`/api/competitions?bootcamp=${bootcampId}`),
  createCompetition: (input: CompetitionInput) => api.post<{ id: number }>('/api/competitions', input),
  updateCompetition: (input: CompetitionInput) => api.patch<{ message: string }>('/api/competitions', input),
  removeCompetition: (id: number) => api.del<{ message: string }>(`/api/competitions?id=${id}`),
};

export const formatBootcampDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
