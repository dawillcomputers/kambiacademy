import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Bootcamp, BootcampRegistrationInput, bootcampApi } from '../lib/bootcamp';

const TOTAL_STEPS = 10;

const COUNTRIES = ['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Other'];
const QUALIFICATIONS = ['Secondary School', 'OND/ND', 'HND', "Bachelor's Degree", "Master's Degree", 'PhD', 'Other'];
const AGE_RANGES = ['Under 18', '18 – 24', '25 – 34', '35 – 44', '45+'];
const GENDERS = ['Male', 'Female', 'Prefer not to say'];
const EMPLOYMENT = ['Student', 'Unemployed', 'Employed', 'Self-Employed', 'Entrepreneur'];
const FINTECH_AREAS = [
  'Digital Payments', 'Blockchain', 'Cybersecurity', 'Product Management', 'Data Analytics',
  'Financial Inclusion', 'AI in Finance', 'Lending', 'Savings & Investments', 'RegTech',
  'InsurTech', 'Embedded Finance', 'Open Banking', 'Mobile Money',
];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['JavaScript', 'Python', 'Java', 'PHP', 'Flutter', 'Other'];
const CAREER_GOALS = ['Career Change', 'Get a Job', 'Build a Startup', 'Improve Skills', 'Networking', 'Academic Purposes', 'Other'];

const BENEFITS = [
  'Learn from industry experts',
  'Build real-world fintech projects',
  'Network with professionals',
  'Access mentorship opportunities',
  'Earn a certificate',
  'Participate in hackathons',
  'Access jobs and internships',
];
const STATS = [
  { value: '5,000+', label: 'Participants' },
  { value: '20+', label: 'Facilitators' },
  { value: '100+', label: 'Projects Built' },
  { value: '15+', label: 'Startup Teams' },
];

const emptyForm: BootcampRegistrationInput = {
  full_name: '', email: '', phone: '', gender: '', date_of_birth: '', age_range: '',
  country: '', state: '', city: '',
  highest_qualification: '', field_of_study: '', institution: '',
  employment_status: '', organization_name: '', current_role: '',
  fintech_interests: [], experience_level: '', tech_project_before: '', coding_experience: '', coding_languages: [],
  career_goals: [], career_goals_text: '',
  startup_interest: '', team_interest: '', startup_idea: '', startup_idea_text: '',
  linkedin_url: '', github_url: '', portfolio_url: '', profile_photo: '',
  consent_terms: false, consent_updates: false, consent_community: false, consent_jobs: false,
};

// ---- Small field primitives -------------------------------------------------
const inputCls = 'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const labelCls = 'block text-sm font-semibold text-slate-700';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className={labelCls}>{label}{required && <span className="text-rose-500"> *</span>}</label>
    {children}
  </div>
);

const RadioGroup: React.FC<{ options: string[]; value?: string; onChange: (v: string) => void; columns?: number }> = ({ options, value, onChange, columns = 1 }) => (
  <div className={`grid gap-2 ${columns === 2 ? 'sm:grid-cols-2' : columns >= 3 ? 'sm:grid-cols-3' : ''}`}>
    {options.map((opt) => (
      <button
        type="button"
        key={opt}
        onClick={() => onChange(opt)}
        className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-left text-sm font-medium transition ${
          value === opt ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${value === opt ? 'border-indigo-500' : 'border-slate-300'}`}>
          {value === opt && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
        </span>
        {opt}
      </button>
    ))}
  </div>
);

const CheckboxGroup: React.FC<{ options: string[]; values: string[]; onChange: (v: string[]) => void; columns?: number }> = ({ options, values, onChange, columns = 2 }) => {
  const toggle = (opt: string) => (values.includes(opt) ? onChange(values.filter((v) => v !== opt)) : onChange([...values, opt]));
  return (
    <div className={`grid gap-2 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {options.map((opt) => {
        const checked = values.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => toggle(opt)}
            className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-left text-sm font-medium transition ${
              checked ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${checked ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'}`}>
              {checked && '✓'}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );
};

const BootcampRegister: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [bootcamp, setBootcamp] = useState<Bootcamp | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BootcampRegistrationInput>(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [done, setDone] = useState<{ title: string; email: string; tempPassword?: string } | null>(null);

  useEffect(() => {
    bootcampApi.list().then((res) => {
      const match = (res.bootcamps || []).find((b) => b.slug === slug) || null;
      setBootcamp(match);
    }).catch(() => {});
  }, [slug]);

  const set = (patch: Partial<BootcampRegistrationInput>) => setForm((prev) => ({ ...prev, ...patch }));

  const stepValid = useMemo(() => {
    switch (step) {
      case 1: return !!(form.full_name.trim() && form.email.trim() && form.phone?.trim() && form.gender && form.age_range);
      case 2: return !!(form.country && form.state?.trim());
      case 3: return !!form.highest_qualification;
      case 4: return !!form.employment_status;
      case 5: return (form.fintech_interests?.length || 0) > 0;
      case 6: return !!form.experience_level;
      case 7: return (form.career_goals?.length || 0) > 0;
      case 10: return !!form.consent_terms;
      default: return true;
    }
  }, [step, form]);

  const next = () => {
    if (!stepValid) {
      setError('Please complete the required fields before continuing.');
      return;
    }
    setError('');
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handlePhoto = async (file?: File | null) => {
    if (!file) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const { url } = await bootcampApi.uploadRegistrationPhoto(file);
      set({ profile_photo: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const submit = async () => {
    if (!stepValid) {
      setError('You must agree to the Terms and Conditions to register.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await bootcampApi.register({ ...form, slug });
      setDone({ title: result.bootcampTitle, email: result.email, tempPassword: result.tempPassword });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Success screen -------------------------------------------------------
  if (done) {
    const steps = ['Verify Email', 'Join WhatsApp Community', 'Complete Profile', 'Access Orientation Materials', 'Add Event to Calendar'];
    return (
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-8 py-12 text-center text-white">
            <div className="text-5xl">🎉</div>
            <h1 className="mt-4 font-display text-3xl font-bold">Welcome to the Kambi Academy × FintechNG Bootcamp</h1>
            <p className="mt-3 text-indigo-100">{done.title}</p>
          </div>
          <div className="space-y-6 px-8 py-8">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-800">
              {done.tempPassword ? (
                <>
                  Your account was created for <strong>{done.email}</strong>. Sign in with your temporary password:
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3">
                    <code className="font-mono text-lg font-bold tracking-wider text-indigo-700">{done.tempPassword}</code>
                  </div>
                  <p className="mt-2 text-xs text-indigo-600">Save this now — you'll be asked to set your own password on first login.</p>
                </>
              ) : (
                <>An account already exists for <strong>{done.email}</strong>. Sign in with your existing password to access this bootcamp.</>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Next steps</h2>
              <ul className="mt-3 space-y-2">
                {steps.map((s) => (
                  <li key={s} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <span className="text-emerald-500">✅</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/bootcamp/login')} className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5">
                Go To Dashboard
              </button>
              <a href="https://chat.whatsapp.com" target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Join Community
              </a>
              <button onClick={() => navigate('/bootcamps')} className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                Download Welcome Pack
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      {/* Left marketing panel */}
      <aside className="hidden overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-8 text-white shadow-2xl lg:block">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200">Kambi × FintechNG Bootcamp</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-tight">Join Africa's Next Generation of Fintech Innovators</h2>
        <ul className="mt-8 space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-indigo-50">
              <span className="text-emerald-300">✅</span> {b}
            </li>
          ))}
        </ul>
        <div className="mt-10 grid grid-cols-2 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur">
              <p className="font-display text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-indigo-100">{s.label}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* Right form */}
      <div className="rounded-[32px] border border-white/70 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Registration</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">{bootcamp?.title || 'Fintech Bootcamp'}</h1>
          </div>
          <span className="text-sm font-semibold text-slate-500">Step {step} of {TOTAL_STEPS}</span>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-right text-xs font-semibold text-slate-400">{progress}% complete</p>

        <div className="mt-6 space-y-5">
          {step === 1 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Personal Information</h3>
              <Field label="Full Name" required><input className={inputCls} value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="e.g. Johnathan Smith" /></Field>
              <Field label="Email Address" required><input type="email" className={inputCls} value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.com" /></Field>
              <Field label="Phone Number" required><input className={inputCls} value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+234 ..." /></Field>
              <Field label="Gender" required><RadioGroup columns={3} options={GENDERS} value={form.gender} onChange={(v) => set({ gender: v })} /></Field>
              <Field label="Date of Birth"><input type="date" className={inputCls} value={form.date_of_birth} onChange={(e) => set({ date_of_birth: e.target.value })} /></Field>
              <Field label="Age Range" required><RadioGroup columns={3} options={AGE_RANGES} value={form.age_range} onChange={(v) => set({ age_range: v })} /></Field>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Location Information</h3>
              <Field label="Country" required>
                <select className={inputCls} value={form.country} onChange={(e) => set({ country: e.target.value })}>
                  <option value="">Select country</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="State / Province" required><input className={inputCls} value={form.state} onChange={(e) => set({ state: e.target.value })} /></Field>
              <Field label="City"><input className={inputCls} value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Educational Background</h3>
              <Field label="Highest Qualification" required>
                <select className={inputCls} value={form.highest_qualification} onChange={(e) => set({ highest_qualification: e.target.value })}>
                  <option value="">Select qualification</option>
                  {QUALIFICATIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              </Field>
              <Field label="Field of Study"><input className={inputCls} value={form.field_of_study} onChange={(e) => set({ field_of_study: e.target.value })} /></Field>
              <Field label="Institution"><input className={inputCls} value={form.institution} onChange={(e) => set({ institution: e.target.value })} /></Field>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Employment Information</h3>
              <Field label="Employment Status" required><RadioGroup columns={2} options={EMPLOYMENT} value={form.employment_status} onChange={(v) => set({ employment_status: v })} /></Field>
              <Field label="Organization Name"><input className={inputCls} value={form.organization_name} onChange={(e) => set({ organization_name: e.target.value })} /></Field>
              <Field label="Current Role"><input className={inputCls} value={form.current_role} onChange={(e) => set({ current_role: e.target.value })} /></Field>
            </>
          )}

          {step === 5 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Fintech Interests</h3>
              <Field label="Which fintech areas interest you?" required>
                <CheckboxGroup columns={2} options={FINTECH_AREAS} values={form.fintech_interests || []} onChange={(v) => set({ fintech_interests: v })} />
              </Field>
            </>
          )}

          {step === 6 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Skills Assessment</h3>
              <Field label="What best describes your level?" required><RadioGroup columns={3} options={LEVELS} value={form.experience_level} onChange={(v) => set({ experience_level: v })} /></Field>
              <Field label="Have you worked on a tech project before?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.tech_project_before} onChange={(v) => set({ tech_project_before: v })} /></Field>
              <Field label="Do you have coding experience?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.coding_experience} onChange={(v) => set({ coding_experience: v })} /></Field>
              {form.coding_experience === 'Yes' && (
                <Field label="Which languages?"><CheckboxGroup columns={3} options={LANGUAGES} values={form.coding_languages || []} onChange={(v) => set({ coding_languages: v })} /></Field>
              )}
            </>
          )}

          {step === 7 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Career Goals</h3>
              <Field label="Why are you joining this bootcamp?" required><CheckboxGroup columns={2} options={CAREER_GOALS} values={form.career_goals || []} onChange={(v) => set({ career_goals: v })} /></Field>
              <Field label="What do you hope to achieve?"><textarea rows={4} className={inputCls} value={form.career_goals_text} onChange={(e) => set({ career_goals_text: e.target.value })} /></Field>
            </>
          )}

          {step === 8 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Innovation & Startup Interest</h3>
              <Field label="Interested in Startup Formation?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.startup_interest} onChange={(v) => set({ startup_interest: v })} /></Field>
              <Field label="Interested in Joining a Team?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.team_interest} onChange={(v) => set({ team_interest: v })} /></Field>
              <Field label="Do you already have a startup idea?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.startup_idea} onChange={(v) => set({ startup_idea: v })} /></Field>
              {form.startup_idea === 'Yes' && (
                <Field label="Tell us about your idea"><textarea rows={3} className={inputCls} value={form.startup_idea_text} onChange={(e) => set({ startup_idea_text: e.target.value })} /></Field>
              )}
            </>
          )}

          {step === 9 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Community & Networking</h3>
              <Field label="Profile Picture">
                <div className="flex items-center gap-4">
                  {form.profile_photo ? (
                    <img src={form.profile_photo} alt="Profile" className="h-16 w-16 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-400">Photo</div>
                  )}
                  <label className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    {uploadingPhoto ? 'Uploading…' : 'Upload Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
                  </label>
                </div>
              </Field>
              <Field label="LinkedIn Profile"><input className={inputCls} value={form.linkedin_url} onChange={(e) => set({ linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." /></Field>
              <Field label="GitHub Profile"><input className={inputCls} value={form.github_url} onChange={(e) => set({ github_url: e.target.value })} placeholder="https://github.com/..." /></Field>
              <Field label="Portfolio Website"><input className={inputCls} value={form.portfolio_url} onChange={(e) => set({ portfolio_url: e.target.value })} placeholder="https://..." /></Field>
            </>
          )}

          {step === 10 && (
            <>
              <h3 className="font-display text-lg font-bold text-slate-900">Consent & Agreements</h3>
              {[
                { key: 'consent_terms' as const, label: 'I agree to the Terms and Conditions', required: true },
                { key: 'consent_updates' as const, label: 'I agree to receive updates from Kambi Academy' },
                { key: 'consent_community' as const, label: 'I consent to being added to the community platform' },
                { key: 'consent_jobs' as const, label: 'I consent to receiving internship and job opportunities' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => set({ [c.key]: !form[c.key] } as Partial<BootcampRegistrationInput>)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                    form[c.key] ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${form[c.key] ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'}`}>
                    {form[c.key] && '✓'}
                  </span>
                  {c.label}{c.required && <span className="text-rose-500"> *</span>}
                </button>
              ))}
            </>
          )}
        </div>

        {error && <p className="mt-5 text-sm font-semibold text-rose-600">{error}</p>}

        <div className="mt-7 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button onClick={back} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Back</button>
          ) : (
            <Link to={`/bootcamps/${slug}`} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</Link>
          )}
          {step < TOTAL_STEPS ? (
            <button onClick={next} className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5">
              Save & Continue
            </button>
          ) : (
            <button onClick={submit} disabled={submitting} className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BootcampRegister;
