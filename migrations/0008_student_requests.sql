-- Student requests system
CREATE TABLE IF NOT EXISTS student_requests (
  id TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  teacherId TEXT NOT NULL,
  courseId TEXT,
  type TEXT NOT NULL CHECK (type IN ('help', 'clarification', 'meeting', 'other')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_requests_student ON student_requests(studentId);
CREATE INDEX IF NOT EXISTS idx_student_requests_teacher ON student_requests(teacherId);
CREATE INDEX IF NOT EXISTS idx_student_requests_status ON student_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_requests_created ON student_requests(createdAt);