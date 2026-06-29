import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BootcampRegistrationInput, DiscountValidation, SignupConfig, bootcampApi, discountApi } from '../lib/bootcamp';

const QUALIFICATIONS = ['Secondary School', 'OND/ND', 'HND', "Bachelor's Degree", "Master's Degree", 'PhD', 'Other'];
const AGE_RANGES = ['Under 18', '18 – 24', '25 – 34', '35 – 44', '45+'];
const GENDERS = ['Male', 'Female', 'Prefer not to say'];
const EMPLOYMENT = ['Student', 'Unemployed', 'Employed', 'Self-Employed', 'Entrepreneur'];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['JavaScript', 'Python', 'Java', 'PHP', 'Flutter', 'Other'];
const CAREER_GOALS = ['Career Change', 'Get a Job', 'Build a Startup', 'Improve Skills', 'Networking', 'Academic Purposes', 'Other'];

// Canonical order for optional sections a manager can enable.
const OPTIONAL_ORDER = ['location', 'education', 'employment', 'interests', 'skills', 'goals', 'innovation', 'community'];

const SECTION_TITLE: Record<string, string> = {
  personal: 'Personal Information',
  location: 'Location',
  education: 'Educational Background',
  employment: 'Employment',
  interests: 'Areas of Interest',
  skills: 'Skills Assessment',
  goals: 'Your Goals',
  innovation: 'Innovation & Startup',
  community: 'Community & Networking',
  consent: 'Consent & Agreements',
};

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

const inputCls = 'w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-indigo-500';

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-semibold text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</label>
    {children}
  </div>
);

const RadioGroup: React.FC<{ options: string[]; value?: string; onChange: (v: string) => void; columns?: number }> = ({ options, value, onChange, columns = 1 }) => (
  <div className={`grid gap-2 ${columns === 2 ? 'sm:grid-cols-2' : columns >= 3 ? 'sm:grid-cols-3' : ''}`}>
    {options.map((opt) => (
      <button type="button" key={opt} onClick={() => onChange(opt)}
        className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-left text-sm font-medium transition ${value === opt ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
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
          <button type="button" key={opt} onClick={() => toggle(opt)}
            className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-left text-sm font-medium transition ${checked ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${checked ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'}`}>{checked && '✓'}</span>
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
  const [config, setConfig] = useState<SignupConfig | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<BootcampRegistrationInput>(emptyForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [done, setDone] = useState<{ title: string; email: string; tempPassword?: string } | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discount, setDiscount] = useState<DiscountValidation | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  useEffect(() => {
    if (!slug) return;
    bootcampApi.signupConfig(slug).then(setConfig).catch(() => setError('This bootcamp is not available for registration.'));
  }, [slug]);

  // Ordered list of steps: personal first, manager-enabled sections, consent last.
  const steps = useMemo(() => {
    const enabled = new Set(config?.sections || []);
    const middle = OPTIONAL_ORDER.filter((s) => enabled.has(s));
    return ['personal', ...middle, 'consent'];
  }, [config]);

  const interestOptions = config?.interests || [];
  const set = (patch: Partial<BootcampRegistrationInput>) => setForm((prev) => ({ ...prev, ...patch }));
  const current = steps[stepIndex];

  const stepValid = useMemo(() => {
    switch (current) {
      case 'personal': return !!(form.full_name.trim() && form.email.trim() && form.phone?.trim() && form.gender && form.age_range);
      case 'location': return !!(form.country && form.state?.trim());
      case 'education': return !!form.highest_qualification;
      case 'employment': return !!form.employment_status;
      case 'interests': return interestOptions.length === 0 || (form.fintech_interests?.length || 0) > 0;
      case 'skills': return !!form.experience_level;
      case 'goals': return (form.career_goals?.length || 0) > 0;
      case 'consent': return !!form.consent_terms;
      default: return true;
    }
  }, [current, form, interestOptions.length]);

  const next = () => {
    if (!stepValid) { setError('Please complete the required fields before continuing.'); return; }
    setError('');
    setStepIndex((s) => Math.min(steps.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => { setError(''); setStepIndex((s) => Math.max(0, s - 1)); };

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
    if (!stepValid) { setError('You must agree to the Terms and Conditions to register.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const result = await bootcampApi.register({
        ...form,
        slug,
        discount_code: discount?.valid ? discountCode.trim().toUpperCase() : undefined,
      });
      // Paid bootcamps hand off to Flutterwave; the payment-callback page finalizes it.
      if (result.requiresPayment && result.payment_url) {
        window.location.assign(result.payment_url);
        return;
      }
      setDone({ title: result.bootcampTitle, email: result.email, tempPassword: result.tempPassword });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const fee = Number(config?.price || 0);
  const effectiveFee = discount?.valid ? discount.amount_after : fee;
  const feeLabel = effectiveFee > 0 ? `₦${effectiveFee.toLocaleString()}` : '';

  const applyDiscount = async () => {
    if (!discountCode.trim() || !config) return;
    setApplyingDiscount(true);
    setError('');
    try {
      const res = await discountApi.validate({
        code: discountCode,
        bootcampId: config.bootcampId,
        amount: fee,
        email: form.email.trim().toLowerCase() || undefined,
      });
      setDiscount(res);
    } catch (err) {
      setDiscount({ valid: false, reason: err instanceof Error ? err.message : 'Could not check code.', amount_before: fee, amount_after: fee, discount: 0, is_free: false });
    } finally {
      setApplyingDiscount(false);
    }
  };

  if (done) {
    const nextSteps = ['Verify Email', 'Join the Community', 'Complete Profile', 'Access Orientation Materials', 'Add Event to Calendar'];
    return (
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[32px] border border-white/70 bg-white shadow-2xl">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-8 py-12 text-center text-white">
            <div className="text-5xl">🎉</div>
            <h1 className="mt-4 font-display text-3xl font-bold">Welcome to {done.title}</h1>
          </div>
          <div className="space-y-6 px-8 py-8">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 text-sm text-indigo-800">
              {done.tempPassword ? (
                <>
                  Your account was created for <strong>{done.email}</strong>. Sign in with your temporary password:
                  <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3">
                    <code className="font-mono text-lg font-bold tracking-wider text-indigo-700">{done.tempPassword}</code>
                  </div>
                  <p className="mt-2 text-xs text-indigo-600">Save this now — you'll set your own password on first login.</p>
                </>
              ) : (
                <>An account already exists for <strong>{done.email}</strong>. Sign in with your existing password to access this bootcamp.</>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Next steps</h2>
              <ul className="mt-3 space-y-2">
                {nextSteps.map((s) => (
                  <li key={s} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <span className="text-emerald-500">✅</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/bootcamp/login')} className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5">Go To Dashboard</button>
              <button onClick={() => navigate('/bootcamps')} className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Back to bootcamps</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center py-24">
        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-500" />}
      </div>
    );
  }

  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  return (
    <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
      {/* Left marketing panel — driven by the bootcamp manager's config */}
      <aside className="hidden overflow-hidden rounded-[32px] bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-8 text-white shadow-2xl lg:block">
        <img src="/kambiacademy_logo.jpg" alt="Kambi Academy" className="mb-5 h-11 w-11 rounded-xl bg-white/90 object-contain p-1" />
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200">{config.title}</p>
        <h2 className="mt-4 font-display text-3xl font-bold leading-tight">{config.headline}</h2>
        {config.subtitle && <p className="mt-3 text-sm leading-7 text-indigo-100">{config.subtitle}</p>}
        {config.benefits.length > 0 && (
          <ul className="mt-8 space-y-3">
            {config.benefits.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-indigo-50"><span className="text-emerald-300">✅</span> {b}</li>
            ))}
          </ul>
        )}
        {config.stats.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-4">
            {config.stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur">
                <p className="font-display text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-indigo-100">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* Right form */}
      <div className="rounded-[32px] border border-white/70 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-500">Registration</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-slate-900">{config.title}</h1>
            <p className="mt-0.5 text-xs text-slate-500">Already registered? <Link to="/bootcamp/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link></p>
          </div>
          <span className="text-sm font-semibold text-slate-500">Step {stepIndex + 1} of {steps.length}</span>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-right text-xs font-semibold text-slate-400">{progress}% complete</p>

        <div className="mt-6 space-y-5">
          <h3 className="font-display text-lg font-bold text-slate-900">{SECTION_TITLE[current]}</h3>

          {current === 'personal' && (
            <>
              <Field label="Full Name" required><input className={inputCls} value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="e.g. Johnathan Smith" /></Field>
              <Field label="Email Address" required><input type="email" className={inputCls} value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.com" /></Field>
              <Field label="Phone Number" required><input className={inputCls} value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+234 ..." /></Field>
              <Field label="Gender" required><RadioGroup columns={3} options={GENDERS} value={form.gender} onChange={(v) => set({ gender: v })} /></Field>
              <Field label="Age Range" required><RadioGroup columns={3} options={AGE_RANGES} value={form.age_range} onChange={(v) => set({ age_range: v })} /></Field>
            </>
          )}

          {current === 'location' && (
            <>
              <Field label="Country" required>
                <select className={inputCls} value={form.country} onChange={(e) => set({ country: e.target.value })}>
                  <option value="">Select country</option>
                  {['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Other'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="State / Province" required><input className={inputCls} value={form.state} onChange={(e) => set({ state: e.target.value })} /></Field>
              <Field label="City"><input className={inputCls} value={form.city} onChange={(e) => set({ city: e.target.value })} /></Field>
            </>
          )}

          {current === 'education' && (
            <>
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

          {current === 'employment' && (
            <>
              <Field label="Employment Status" required><RadioGroup columns={2} options={EMPLOYMENT} value={form.employment_status} onChange={(v) => set({ employment_status: v })} /></Field>
              <Field label="Organization Name"><input className={inputCls} value={form.organization_name} onChange={(e) => set({ organization_name: e.target.value })} /></Field>
              <Field label="Current Role"><input className={inputCls} value={form.current_role} onChange={(e) => set({ current_role: e.target.value })} /></Field>
            </>
          )}

          {current === 'interests' && (
            <Field label="Which areas interest you?" required={interestOptions.length > 0}>
              {interestOptions.length > 0 ? (
                <CheckboxGroup columns={2} options={interestOptions} values={form.fintech_interests || []} onChange={(v) => set({ fintech_interests: v })} />
              ) : (
                <p className="text-sm text-slate-500">No options configured.</p>
              )}
            </Field>
          )}

          {current === 'skills' && (
            <>
              <Field label="What best describes your level?" required><RadioGroup columns={3} options={LEVELS} value={form.experience_level} onChange={(v) => set({ experience_level: v })} /></Field>
              <Field label="Do you have coding experience?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.coding_experience} onChange={(v) => set({ coding_experience: v })} /></Field>
              {form.coding_experience === 'Yes' && (
                <Field label="Which languages?"><CheckboxGroup columns={3} options={LANGUAGES} values={form.coding_languages || []} onChange={(v) => set({ coding_languages: v })} /></Field>
              )}
            </>
          )}

          {current === 'goals' && (
            <>
              <Field label="Why are you joining?" required><CheckboxGroup columns={2} options={CAREER_GOALS} values={form.career_goals || []} onChange={(v) => set({ career_goals: v })} /></Field>
              <Field label="What do you hope to achieve?"><textarea rows={4} className={inputCls} value={form.career_goals_text} onChange={(e) => set({ career_goals_text: e.target.value })} /></Field>
            </>
          )}

          {current === 'innovation' && (
            <>
              <Field label="Interested in startup formation?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.startup_interest} onChange={(v) => set({ startup_interest: v })} /></Field>
              <Field label="Interested in joining a team?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.team_interest} onChange={(v) => set({ team_interest: v })} /></Field>
              <Field label="Do you already have a startup idea?"><RadioGroup columns={2} options={['Yes', 'No']} value={form.startup_idea} onChange={(v) => set({ startup_idea: v })} /></Field>
              {form.startup_idea === 'Yes' && (
                <Field label="Tell us about your idea"><textarea rows={3} className={inputCls} value={form.startup_idea_text} onChange={(e) => set({ startup_idea_text: e.target.value })} /></Field>
              )}
            </>
          )}

          {current === 'community' && (
            <>
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

          {current === 'consent' && (
            <>
              {fee > 0 && (
                <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-indigo-900">Registration fee</p>
                      <p className="text-xs text-indigo-600">Secured by Flutterwave — pay after you agree below.</p>
                    </div>
                    <div className="text-right">
                      {discount?.valid && discount.discount > 0 && (
                        <span className="mr-2 text-sm text-slate-400 line-through">₦{fee.toLocaleString()}</span>
                      )}
                      <span className="font-display text-xl font-bold text-indigo-700">{effectiveFee > 0 ? `₦${effectiveFee.toLocaleString()}` : 'Free'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={discountCode}
                      onChange={(e) => { setDiscountCode(e.target.value); setDiscount(null); }}
                      placeholder="Discount code"
                      className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold uppercase tracking-wide text-black placeholder:font-normal placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={applyDiscount}
                      disabled={applyingDiscount || !discountCode.trim()}
                      className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {applyingDiscount ? '…' : 'Apply'}
                    </button>
                  </div>
                  {discount && (
                    <p className={`text-xs font-semibold ${discount.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {discount.valid
                        ? `Code applied — you save ₦${discount.discount.toLocaleString()}${discount.is_free ? ' (registration is now free!)' : ''}.`
                        : discount.reason || 'Invalid code.'}
                    </p>
                  )}
                </div>
              )}
              {[
                { key: 'consent_terms' as const, label: 'I agree to the Terms and Conditions', required: true },
                { key: 'consent_updates' as const, label: 'I agree to receive updates from Kambi Academy' },
                { key: 'consent_community' as const, label: 'I consent to being added to the community platform' },
                { key: 'consent_jobs' as const, label: 'I consent to receiving internship and job opportunities' },
              ].map((c) => (
                <button key={c.key} type="button" onClick={() => set({ [c.key]: !form[c.key] } as Partial<BootcampRegistrationInput>)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${form[c.key] ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${form[c.key] ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300'}`}>{form[c.key] && '✓'}</span>
                  {c.label}{c.required && <span className="text-rose-500"> *</span>}
                </button>
              ))}
            </>
          )}
        </div>

        {error && <p className="mt-5 text-sm font-semibold text-rose-600">{error}</p>}

        <div className="mt-7 flex items-center justify-between gap-3">
          {stepIndex > 0 ? (
            <button onClick={back} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Back</button>
          ) : (
            <Link to={`/bootcamps/${slug}`} className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</Link>
          )}
          {stepIndex < steps.length - 1 ? (
            <button onClick={next} className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5">Save & Continue</button>
          ) : (
            <button onClick={submit} disabled={submitting} className="rounded-full bg-gradient-to-r from-indigo-600 to-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60">
              {submitting ? 'Processing…' : effectiveFee > 0 ? `Pay ${feeLabel} & Register` : 'Submit Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BootcampRegister;
