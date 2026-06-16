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
  // Registration / marketing config (raw JSON strings on admin/manage scope)
  initial_participants?: number;
  signup_headline?: string;
  signup_subtitle?: string;
  signup_benefits?: string;
  signup_stats?: string;
  signup_sections?: string;
  signup_interests?: string;
}

export interface SignupStat {
  label: string;
  value: string;
}

export interface SignupConfig {
  bootcampId: number;
  slug: string;
  title: string;
  status: string;
  price: number;
  headline: string;
  subtitle: string;
  benefits: string[];
  stats: SignupStat[];
  sections: string[];
  interests: string[];
}

export interface BootcampResource {
  id: number;
  bootcamp_id: number;
  title: string;
  description: string;
  type: 'link' | 'text' | 'announcement' | 'file';
  url: string;
  content: string;
  category?: string;
  file_key?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  download_count?: number;
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

export interface CompetitionPrize {
  id?: number;
  position?: number;
  title: string;
  reward: string;
}

export interface BootcampCompetition {
  id: number;
  bootcamp_id: number;
  bootcamp_title?: string;
  bootcamp_slug?: string;
  title: string;
  description: string;
  image_url: string;
  flyer_url?: string;
  rules?: string;
  event_date?: string | null;
  published: boolean;
  winners: CompetitionWinner[];
  prizes?: CompetitionPrize[];
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
  initial_participants?: number;
  signup_headline?: string;
  signup_subtitle?: string;
  signup_benefits?: string[];
  signup_stats?: SignupStat[];
  signup_sections?: string[];
  signup_interests?: string[];
}

export interface CompetitionInput {
  id?: number;
  bootcamp_id?: number;
  title?: string;
  description?: string;
  image_url?: string;
  flyer_url?: string;
  rules?: string;
  event_date?: string;
  published?: boolean;
  winners?: CompetitionWinner[];
  prizes?: CompetitionPrize[];
}

export interface BootcampRegistrationInput {
  bootcampId?: number;
  slug?: string;
  full_name: string;
  email: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  age_range?: string;
  country?: string;
  state?: string;
  city?: string;
  highest_qualification?: string;
  field_of_study?: string;
  institution?: string;
  employment_status?: string;
  organization_name?: string;
  current_role?: string;
  fintech_interests?: string[];
  experience_level?: string;
  tech_project_before?: string;
  coding_experience?: string;
  coding_languages?: string[];
  career_goals?: string[];
  career_goals_text?: string;
  startup_interest?: string;
  team_interest?: string;
  startup_idea?: string;
  startup_idea_text?: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  profile_photo?: string;
  consent_terms?: boolean;
  consent_updates?: boolean;
  consent_community?: boolean;
  consent_jobs?: boolean;
}

export interface BootcampRegistrationResult {
  message: string;
  email: string;
  bootcampSlug: string;
  bootcampTitle: string;
  isNewAccount: boolean;
  tempPassword?: string;
  // Paid bootcamps return a Flutterwave checkout link instead of finishing immediately.
  requiresPayment?: boolean;
  amount?: number;
  transactionRef?: string;
  payment_url?: string;
}

export interface BootcampPaymentVerifyResult {
  message: string;
  email: string;
  bootcampSlug: string;
  bootcampTitle: string;
  isNewAccount: boolean;
  tempPassword?: string;
  amountPaid?: number;
}

export interface BootcampRegistration {
  id: number;
  user_id: number;
  bootcamp_id: number;
  bootcamp_title?: string;
  user_role?: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  age_range: string;
  country: string;
  state: string;
  city: string;
  highest_qualification: string;
  employment_status: string;
  experience_level: string;
  fintech_interests: string;
  profile_photo: string;
  linkedin_url: string;
  registration_status: string;
  temp_password?: string;
  must_change_password?: number;
  created_at: string;
}

export interface Facilitator {
  id: number;
  bootcamp_id: number;
  user_id?: number | null;
  name: string;
  email: string;
  role: 'facilitator' | 'mentor';
  industry?: string;
  expertise?: string;
  country?: string;
  linkedin_url?: string;
  bio?: string;
  avatar_url?: string;
  created_at: string;
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

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

  // Per-bootcamp registration config (public — drives the signup wizard)
  signupConfig: (slug: string) => api.get<SignupConfig>(`/api/bootcamps/signup-config?slug=${encodeURIComponent(slug)}`),

  // Detailed registration (creates a separate bootcamp account). Free bootcamps finish
  // immediately; paid bootcamps return a Flutterwave `payment_url` to redirect to.
  register: (input: BootcampRegistrationInput) => api.post<BootcampRegistrationResult>('/api/bootcamps/register', { ...input, action: 'initiate' }),
  // Confirm a returning Flutterwave bootcamp payment and finalize the registration.
  verifyRegistration: (input: { slug?: string; transactionRef: string; flutterwaveTransactionId?: string; status?: string }) =>
    api.post<BootcampPaymentVerifyResult>('/api/bootcamps/register', { action: 'verify', ...input }),
  uploadRegistrationPhoto: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.set('file', file);
    const res = await fetch(`${apiBase}/api/bootcamps/registration-photo`, { method: 'POST', body: formData });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) throw new Error(data.error || 'Photo upload failed.');
    return { url: data.url || '' };
  },
  uploadCoverImage: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.set('file', file);
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${apiBase}/api/bootcamps/cover-image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok) throw new Error(data.error || 'Cover upload failed.');
    return { url: data.url || '' };
  },

  // Facilitators & mentors (managed by the bootcamp manager)
  facilitators: (bootcampId: number) => api.get<{ facilitators: Facilitator[] }>(`/api/bootcamps/facilitators?bootcamp=${bootcampId}`),
  addFacilitator: (input: { bootcamp_id: number; user_id?: number; name?: string; email?: string; role: 'facilitator' | 'mentor' }) =>
    api.post<{ message: string }>('/api/bootcamps/facilitators', input),
  updateFacilitator: (input: { id: number; role?: string; industry?: string; expertise?: string; country?: string; linkedin_url?: string; bio?: string; avatar_url?: string }) =>
    api.patch<{ message: string }>('/api/bootcamps/facilitators', input),
  removeFacilitator: (id: number) => api.del<{ message: string }>(`/api/bootcamps/facilitators?id=${id}`),

  // Registrants (super admin / manager)
  registrations: (bootcampId?: number) =>
    api.get<{ registrations: BootcampRegistration[] }>(`/api/bootcamps/registrations${bootcampId ? `?bootcamp=${bootcampId}` : ''}`),
  appointManager: (bootcampId: number, userId: number) =>
    api.post<{ message: string }>('/api/bootcamps/registrations', { action: 'appoint_manager', bootcampId, userId }),
  resetPassword: (userId: number) =>
    api.post<{ message: string; tempPassword: string }>('/api/bootcamps/registrations', { action: 'reset_password', userId }),

  // Enrollments
  myEnrollments: () => api.get<{ bootcamps: Bootcamp[] }>('/api/bootcamps/enroll'),
  enroll: (slug: string) => api.post<{ message: string; slug: string; id: number }>('/api/bootcamps/enroll', { slug }),

  // Hub resources
  resources: (bootcampId: number) => api.get<{ resources: BootcampResource[] }>(`/api/bootcamps/resources?bootcamp=${bootcampId}`),
  addResource: (input: {
    bootcamp_id: number; title: string; description?: string; type?: string; url?: string; content?: string;
    category?: string; file_key?: string; file_name?: string; file_size?: number; mime_type?: string;
  }) => api.post<{ id: number }>('/api/bootcamps/resources', input),
  removeResource: (id: number) => api.del<{ message: string }>(`/api/bootcamps/resources?id=${id}`),
  uploadResourceFile: async (bootcampId: number, file: File): Promise<{ file_key: string; file_name: string; file_size: number; mime_type: string }> => {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('bootcamp_id', String(bootcampId));
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${apiBase}/api/bootcamps/resource-file`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = (await res.json()) as any;
    if (!res.ok) throw new Error(data.error || 'File upload failed.');
    return data;
  },
  resourceDownloadUrl: (resourceId: number) => {
    const token = localStorage.getItem('auth_token') || '';
    return `${apiBase}/api/bootcamps/resource-file?id=${resourceId}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },

  // Competitions
  publicCompetitions: () => api.get<{ competitions: BootcampCompetition[] }>('/api/competitions'),
  competitions: (bootcampId: number) => api.get<{ competitions: BootcampCompetition[] }>(`/api/competitions?bootcamp=${bootcampId}`),
  createCompetition: (input: CompetitionInput) => api.post<{ id: number }>('/api/competitions', input),
  updateCompetition: (input: CompetitionInput) => api.patch<{ message: string }>('/api/competitions', input),
  removeCompetition: (id: number) => api.del<{ message: string }>(`/api/competitions?id=${id}`),
};

export interface DiscountCode {
  id: number;
  code: string;
  description: string;
  type: 'percent' | 'fixed';
  value: number;
  scope: 'global' | 'bootcamp';
  bootcamp_id: number | null;
  bootcamp_title?: string | null;
  max_uses: number | null;
  used_count: number;
  single_use_per_email: number;
  expires_at: string | null;
  active: number;
  created_at: string;
}

export interface DiscountValidation {
  valid: boolean;
  reason?: string;
  amount_before: number;
  amount_after: number;
  discount: number;
  is_free: boolean;
  type?: 'percent' | 'fixed';
  value?: number;
}

export const discountApi = {
  list: (bootcampId?: number) =>
    api.get<{ codes: DiscountCode[] }>(`/api/discounts${bootcampId ? `?bootcamp=${bootcampId}` : ''}`),
  create: (input: {
    code: string; description?: string; type: 'percent' | 'fixed'; value: number;
    scope?: 'global' | 'bootcamp'; bootcamp_id?: number | null; max_uses?: number | null;
    single_use_per_email?: boolean; expires_at?: string | null;
  }) => api.post<{ id: number }>('/api/discounts', { action: 'create', ...input }),
  toggle: (id: number, active: boolean) => api.patch<{ message: string }>('/api/discounts', { id, active }),
  remove: (id: number) => api.del<{ message: string }>(`/api/discounts?id=${id}`),
  // Public live preview while registering.
  validate: (input: { code: string; bootcampId?: number; amount: number; email?: string }) =>
    api.post<DiscountValidation>('/api/discounts', { action: 'validate', ...input }),
};

export interface LiveSession {
  id: number;
  bootcamp_id: number;
  title: string;
  description: string;
  provider: 'zoom' | 'meet' | 'teams' | 'other';
  url: string;
  meeting_id: string;
  passcode: string;
  starts_at: string | null;
  duration_minutes: number;
  status: 'scheduled' | 'live' | 'ended';
  created_at: string;
}

export interface ActivityItem {
  id: number;
  type: 'material' | 'competition' | 'live' | 'announcement' | 'mentor';
  title: string;
  body: string;
  link: string;
  icon: string;
  created_at: string;
  author_name?: string | null;
  like_count: number;
  save_count: number;
  liked: boolean;
  saved: boolean;
}

export const liveApi = {
  list: (bootcampId: number) => api.get<{ sessions: LiveSession[] }>(`/api/bootcamps/live-sessions?bootcamp=${bootcampId}`),
  create: (input: Partial<LiveSession> & { bootcamp_id: number; title: string }) =>
    api.post<{ id: number }>('/api/bootcamps/live-sessions', input),
  update: (input: Partial<LiveSession> & { id: number }) => api.patch<{ message: string }>('/api/bootcamps/live-sessions', input),
  remove: (id: number) => api.del<{ message: string }>(`/api/bootcamps/live-sessions?id=${id}`),
};

export const activityApi = {
  list: (bootcampId: number) => api.get<{ activity: ActivityItem[] }>(`/api/bootcamps/activity?bootcamp=${bootcampId}`),
  announce: (input: { bootcamp_id: number; title: string; body?: string; link?: string }) =>
    api.post<{ message: string }>('/api/bootcamps/activity', { action: 'announce', ...input }),
  react: (activityId: number, kind: 'like' | 'save') =>
    api.post<{ active: boolean }>('/api/bootcamps/activity', { action: 'react', activity_id: activityId, kind }),
};

export const formatBootcampDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
