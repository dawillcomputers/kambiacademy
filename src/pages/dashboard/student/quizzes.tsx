import React, { useMemo, useState } from 'react';
import { AuthUser } from '../../../../lib/auth';
import { api } from '../../../../lib/api';
import { Course, Quiz } from '../../../../types';
import Button from '../../../../components/Button';
import Card from '../../../../components/Card';

interface StudentQuizzesProps {
  user: AuthUser;
  courses: Course[];
  quizzes: Quiz[];
  quizResponses: any[];
  onSubmitted: () => Promise<void>;
}

const StudentQuizzes: React.FC<StudentQuizzesProps> = ({ courses, quizzes, quizResponses, onSubmitted }) => {
  const [activeQuiz, setActiveQuiz] = useState<{ quiz: any; questions: any[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const responsesByQuizId = useMemo(() => new Map(quizResponses.map((response) => [String(response.quiz_id ?? response.quizId), response])), [quizResponses]);

  const openQuiz = async (quiz: Quiz) => {
    setLoadingQuizId(quiz.id);
    setStatusMessage('');
    try {
      const response = await api.getQuiz(Number(quiz.id));
      setActiveQuiz(response);
      setAnswers({});
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to open this quiz.');
    } finally {
      setLoadingQuizId(null);
    }
  };

  const submitQuiz = async () => {
    if (!activeQuiz) {
      return;
    }

    const payload = Object.entries(answers).map(([questionId, selectedOption]) => ({
      question_id: Number(questionId),
      selected_option: selectedOption,
    }));

    if (!payload.length) {
      setStatusMessage('Answer at least one question before submitting.');
      return;
    }

    setSubmitting(true);
    setStatusMessage('');
    try {
      const response = await api.submitQuizResponse(Number(activeQuiz.quiz.id), payload);
      setStatusMessage(`Quiz submitted. You scored ${response.score}/${response.max_score} (${response.percentage}%).`);
      await onSubmitted();
      setActiveQuiz(null);
      setAnswers({});
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (activeQuiz) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">{activeQuiz.quiz.title}</h1>
            <p className="text-slate-600">Answer each question, then submit once you are done.</p>
          </div>
          <Button variant="secondary" onClick={() => setActiveQuiz(null)}>Back to quizzes</Button>
        </div>

        <div className="space-y-4">
          {activeQuiz.questions.map((question: any, index: number) => (
            <Card key={question.id} className="p-6">
              <h2 className="text-lg font-semibold text-slate-900">{index + 1}. {question.question_text}</h2>
              <div className="mt-4 space-y-3">
                {[
                  ['a', question.option_a],
                  ['b', question.option_b],
                  ['c', question.option_c],
                  ['d', question.option_d],
                ].filter(([, label]) => Boolean(label)).map(([optionKey, label]) => (
                  <label key={optionKey} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={answers[String(question.id)] === optionKey}
                      onChange={() => setAnswers((current) => ({ ...current, [String(question.id)]: optionKey }))}
                      className="mt-1"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">{Object.keys(answers).length} answered</span>
          <Button onClick={() => void submitQuiz()} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>

        {statusMessage && <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{statusMessage}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Quizzes</h1>
        <p className="text-slate-600">Take quizzes from your enrolled courses and track your scores.</p>
      </div>

      {statusMessage && <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{statusMessage}</div>}

      <div className="space-y-4">
        {quizzes.length ? quizzes.map((quiz) => {
          const course = courses.find((item) => item.id === quiz.courseId);
          const response = responsesByQuizId.get(quiz.id);
          const isCompleted = Boolean(response);

          return (
            <Card key={quiz.id} className="p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{quiz.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">{quiz.description || 'Teacher quiz'}</p>
                  <p className="mt-3 text-sm text-slate-500">{course?.title || 'Course'}{quiz.timeLimit ? ` • ${quiz.timeLimit} minutes` : ''}</p>
                </div>
                <div className="text-right">
                  {isCompleted ? (
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      <p className="font-semibold">Completed</p>
                      <p className="mt-1">Score {response.score}/{response.max_score}</p>
                    </div>
                  ) : (
                    <Button onClick={() => void openQuiz(quiz)} disabled={loadingQuizId === quiz.id}>
                      {loadingQuizId === quiz.id ? 'Loading...' : 'Start Quiz'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        }) : (
          <Card className="p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-900">No quizzes available yet</h2>
            <p className="mt-2 text-sm text-slate-600">Your teachers have not published any quizzes for your enrolled classes yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentQuizzes;