import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../../lib/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';

type MaterialType = 'file' | 'youtube';

interface TeacherCourseRecord {
  id: number;
  title: string;
  slug: string;
}

interface TeacherMaterialRecord {
  id: number;
  course_slug: string;
  title: string;
  description: string;
  type: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  youtube_url?: string | null;
  created_at?: string;
}

interface MaterialFormState {
  course_slug: string;
  title: string;
  description: string;
  type: MaterialType;
  youtube_url: string;
}

const defaultFormState: MaterialFormState = {
  course_slug: '',
  title: '',
  description: '',
  type: 'file',
  youtube_url: '',
};

const normalizeCourse = (course: any): TeacherCourseRecord => ({
  id: Number(course.id ?? 0),
  title: course.title || 'Untitled course',
  slug: String(course.slug || course.course_slug || course.title || ''),
});

const normalizeMaterial = (material: any): TeacherMaterialRecord => ({
  id: Number(material.id ?? 0),
  course_slug: String(material.course_slug || material.courseSlug || ''),
  title: material.title || 'Untitled material',
  description: material.description || '',
  type: material.type || 'file',
  file_name: material.file_name || null,
  file_size: material.file_size === null || material.file_size === undefined ? null : Number(material.file_size),
  mime_type: material.mime_type || null,
  youtube_url: material.youtube_url || null,
  created_at: material.created_at || '',
});

const formatDate = (value?: string) => {
  if (!value) {
    return 'Recently added';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Recently added' : parsed.toLocaleString();
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || Number.isNaN(bytes)) {
    return 'Size unavailable';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getMaterialLabel = (material: TeacherMaterialRecord) => {
  if (material.youtube_url || material.type === 'youtube') {
    return 'YouTube';
  }
  if (material.mime_type?.includes('pdf')) {
    return 'PDF';
  }
  if (material.mime_type?.startsWith('video/')) {
    return 'Video';
  }
  if (material.mime_type?.startsWith('image/')) {
    return 'Image';
  }
  return 'File';
};

const getMaterialUrl = (id: number) => {
  const baseUrl = api.getMaterialDownloadUrl(id);
  const token = localStorage.getItem('auth_token');
  return token ? `${baseUrl}&token=${encodeURIComponent(token)}` : baseUrl;
};

export default function TeacherMaterials() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [courses, setCourses] = useState<TeacherCourseRecord[]>([]);
  const [materials, setMaterials] = useState<TeacherMaterialRecord[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [form, setForm] = useState<MaterialFormState>(defaultFormState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError('');

    const [courseResult, materialResult] = await Promise.allSettled([
      api.tutorGetCourses(),
      api.getMaterials(),
    ]);

    if (courseResult.status === 'fulfilled') {
      setCourses((courseResult.value.courses || []).map(normalizeCourse));
    } else {
      setCourses([]);
      setError(courseResult.reason instanceof Error ? courseResult.reason.message : 'Unable to load your courses.');
    }

    if (materialResult.status === 'fulfilled') {
      setMaterials((materialResult.value.materials || []).map(normalizeMaterial));
    } else {
      setMaterials([]);
      setError((current) => current || (materialResult.reason instanceof Error ? materialResult.reason.message : 'Unable to load your materials.'));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!form.course_slug && courses.length) {
      setForm((current) => ({ ...current, course_slug: courses[0].slug }));
    }
  }, [courses, form.course_slug]);

  useEffect(() => {
    if (selectedCourse !== 'all' && !courses.some((course) => course.slug === selectedCourse)) {
      setSelectedCourse('all');
    }
  }, [courses, selectedCourse]);

  const courseTitleBySlug = useMemo(() => {
    return new Map(courses.map((course) => [course.slug, course.title]));
  }, [courses]);

  const filteredMaterials = useMemo(() => {
    return selectedCourse === 'all'
      ? materials
      : materials.filter((material) => material.course_slug === selectedCourse);
  }, [materials, selectedCourse]);

  const stats = useMemo(() => {
    const fileCount = materials.filter((material) => !material.youtube_url && material.type !== 'youtube').length;
    const youtubeCount = materials.filter((material) => material.youtube_url || material.type === 'youtube').length;
    const activeCourses = new Set(materials.map((material) => material.course_slug).filter(Boolean)).size;

    return [
      { label: 'Total Materials', value: materials.length, detail: 'Everything currently published to learners' },
      { label: 'Uploaded Files', value: fileCount, detail: 'Documents, images, and video files stored in Cloudflare' },
      { label: 'YouTube Links', value: youtubeCount, detail: 'External lesson links embedded for students' },
      { label: 'Courses Covered', value: activeCourses, detail: 'Courses that already have supporting resources' },
    ];
  }, [materials]);

  const updateForm = (field: keyof MaterialFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.course_slug) {
      setError('Choose a course before uploading a material.');
      return;
    }

    if (!form.title.trim()) {
      setError('Material title is required.');
      return;
    }

    if (form.type === 'youtube' && !form.youtube_url.trim()) {
      setError('A YouTube URL is required for link-based materials.');
      return;
    }

    if (form.type === 'file' && !selectedFile) {
      setError('Choose a file to upload.');
      return;
    }

    setUploading(true);

    try {
      await api.uploadMaterial({
        course_slug: form.course_slug,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        youtube_url: form.type === 'youtube' ? form.youtube_url.trim() : undefined,
        file: form.type === 'file' ? selectedFile || undefined : undefined,
      });

      setMessage('Material uploaded successfully.');
      setSelectedCourse(form.course_slug);
      setSelectedFile(null);
      setForm((current) => ({
        ...defaultFormState,
        course_slug: current.course_slug,
      }));
      await loadPage();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload this material.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (material: TeacherMaterialRecord) => {
    if (!window.confirm(`Delete "${material.title}"?`)) {
      return;
    }

    setRemovingId(material.id);
    setError('');
    setMessage('');

    try {
      await api.deleteMaterial(material.id);
      setMaterials((current) => current.filter((item) => item.id !== material.id));
      setMessage('Material deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete this material.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.18),transparent_28%),linear-gradient(135deg,#ffffff,#f8fafc_45%,#ecfeff)] px-6 py-8 shadow-xl shadow-slate-200/70">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Materials Library</p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950">Upload resources students can use immediately</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Publish PDFs, decks, recordings, or YouTube walkthroughs against your courses and keep the classroom library current.
          </p>
        </section>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>}

        {loading ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-sm text-slate-500 shadow-lg">Loading teaching materials...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-lg shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{stat.label}</p>
                  <p className="mt-4 text-3xl font-bold text-slate-950">{stat.value}</p>
                  <p className="mt-4 text-sm text-slate-600">{stat.detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Published Resources</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950">Course materials</h2>
                  </div>

                  <select
                    value={selectedCourse}
                    onChange={(event) => setSelectedCourse(event.target.value)}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                  >
                    <option value="all">All courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.slug}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 space-y-4">
                  {filteredMaterials.length ? filteredMaterials.map((material) => (
                    <article key={material.id} className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold text-slate-950">{material.title}</h3>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                              {getMaterialLabel(material)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            {courseTitleBySlug.get(material.course_slug) || material.course_slug || 'Course pending'}
                          </p>
                          {material.description && (
                            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{material.description}</p>
                          )}
                          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>Added {formatDate(material.created_at)}</span>
                            {material.file_name && <span>{material.file_name}</span>}
                            {material.file_size ? <span>{formatFileSize(material.file_size)}</span> : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {material.youtube_url ? (
                            <a
                              href={material.youtube_url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Open link
                            </a>
                          ) : material.file_name ? (
                            <a
                              href={getMaterialUrl(material.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Open file
                            </a>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => void handleDelete(material)}
                            disabled={removingId === material.id}
                            className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {removingId === material.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    </article>
                  )) : (
                    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                      {selectedCourse === 'all'
                        ? 'No materials uploaded yet. Use the form to publish your first resource.'
                        : 'No materials found for this course yet.'}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">New Upload</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950">Add a material</h2>

                  <form className="mt-6 space-y-5" onSubmit={handleUpload}>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Course</label>
                      <select
                        value={form.course_slug}
                        onChange={(event) => updateForm('course_slug', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                        disabled={!courses.length}
                      >
                        {!courses.length && <option value="">Create a course first</option>}
                        {courses.map((course) => (
                          <option key={course.id} value={course.slug}>{course.title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Title</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) => updateForm('title', event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                        placeholder="Week 1 slide deck"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Description</label>
                      <textarea
                        value={form.description}
                        onChange={(event) => updateForm('description', event.target.value)}
                        rows={4}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                        placeholder="Explain what students should do with this material."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700">Material type</label>
                      <select
                        value={form.type}
                        onChange={(event) => updateForm('type', event.target.value as MaterialType)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                      >
                        <option value="file">File upload</option>
                        <option value="youtube">YouTube link</option>
                      </select>
                    </div>

                    {form.type === 'youtube' ? (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700">YouTube URL</label>
                        <input
                          type="url"
                          value={form.youtube_url}
                          onChange={(event) => updateForm('youtube_url', event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                          placeholder="https://www.youtube.com/watch?v=..."
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700">File</label>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov"
                          onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                          className="mt-2 block w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {selectedFile ? `Selected: ${selectedFile.name}` : 'PDF, Office files, images, and video uploads are supported.'}
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={uploading || !courses.length}
                      className="inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {uploading ? 'Uploading material...' : 'Publish material'}
                    </button>
                  </form>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-lg shadow-slate-200/60">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Publishing Notes</p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    <p>File materials rely on your active platform and storage subscriptions before learners can access them.</p>
                    <p>Use YouTube links for faster publishing when you do not need managed file storage.</p>
                    <p>Keep titles specific so students can find the right handout, recording, or worksheet quickly inside the student dashboard.</p>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}