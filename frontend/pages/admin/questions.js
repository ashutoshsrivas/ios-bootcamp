import { useEffect, useState } from 'react';
import { useRequireRole } from '../../lib/auth';
import { useBootcamp, scoped } from '../../lib/bootcamp';
import { api } from '../../lib/api';
import Layout, { PageHead } from '../../components/Layout';
import {
  Card, Button, Loading, useToast, Badge, Modal, Field, Input, Textarea, Select, Empty,
} from '../../components/UI';

const INPUT_TYPES = ['text', 'textarea', 'number', 'file', 'date', 'url'];
const AUDIENCES = [
  { value: 'all_students', label: 'All students' },
  { value: 'selected_students', label: 'Selected students' },
  { value: 'teams', label: 'Specific teams' },
  { value: 'team_spoc', label: 'Team SPOCs' },
];
const AUD_LABEL = Object.fromEntries(AUDIENCES.map((a) => [a.value, a.label]));

export default function AdminQuestions() {
  const { ok } = useRequireRole(['admin']);
  const { bootcampId } = useBootcamp() || {};
  const toast = useToast();
  const [questions, setQuestions] = useState(null);
  const [students, setStudents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ input_type: 'text', audience: 'all_students', required: true });
  const [targets, setTargets] = useState([]); // ids
  const [busy, setBusy] = useState(false);
  const [answersFor, setAnswersFor] = useState(null);
  const [answers, setAnswers] = useState([]);

  const load = async () => {
    const [q, s, t] = await Promise.all([
      api.get(scoped('/api/questions', bootcampId)),
      api.get(scoped('/api/students?status=approved', bootcampId)),
      api.get(scoped('/api/teams', bootcampId)),
    ]);
    setQuestions(q); setStudents(s); setTeams(t);
  };
  useEffect(() => { if (ok && bootcampId) load().catch((e) => toast.err(e.message)); }, [ok, bootcampId]);

  const openNew = () => { setForm({ input_type: 'text', audience: 'all_students', required: true }); setTargets([]); setCreating(true); };
  const needsStudents = form.audience === 'selected_students';
  const needsTeams = form.audience === 'teams' || form.audience === 'team_spoc';
  const toggleTarget = (id) => setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const save = async () => {
    if (!form.title?.trim()) { toast.err('Title required'); return; }
    const refType = needsStudents ? 'student' : 'team';
    const body = {
      title: form.title, description: form.description, input_type: form.input_type,
      audience: form.audience, required: form.required, bootcamp_id: bootcampId,
      targets: (needsStudents || needsTeams) ? targets.map((id) => ({ ref_type: refType, ref_id: id })) : [],
    };
    setBusy(true);
    try { await api.post('/api/questions', body); setCreating(false); await load(); toast.ok('Question published'); }
    catch (e) { toast.err(e.message); }
    setBusy(false);
  };

  const remove = async (q) => {
    if (!confirm(`Delete "${q.title}"? Answers will be lost.`)) return;
    try { await api.del(`/api/questions/${q.id}`); await load(); toast.show('Deleted'); } catch (e) { toast.err(e.message); }
  };
  const openAnswers = async (q) => {
    setAnswersFor(q);
    try { setAnswers(await api.get(`/api/questions/${q.id}/answers`)); } catch (e) { toast.err(e.message); }
  };

  if (!ok || !bootcampId || !questions) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <PageHead
        title="Submissions"
        subtitle="Collect responses from students — choose the input type and who answers"
        actions={<Button variant="primary" onClick={openNew}>+ New Submission</Button>}
      />

      {questions.length === 0 ? (
        <Card><Empty icon="❓" title="No questions yet" /></Card>
      ) : (
        <div className="list">
          {questions.map((q) => (
            <div className="row" key={q.id}>
              <div className="grow">
                <div className="title">{q.title}</div>
                <div className="desc">
                  <Badge color="blue">{q.input_type}</Badge>{' '}
                  <Badge color="purple">{AUD_LABEL[q.audience]}</Badge>{' '}
                  {q.required ? <Badge color="orange">required</Badge> : null}
                </div>
              </div>
              <Button size="sm" onClick={() => openAnswers(q)}>{q.answer_count} answer{q.answer_count === 1 ? '' : 's'}</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(q)}>Delete</Button>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <Modal
          title="New Submission"
          wide
          onClose={() => setCreating(false)}
          footer={<><Button onClick={() => setCreating(false)}>Cancel</Button><Button variant="primary" onClick={save} disabled={busy}>Publish</Button></>}
        >
          <Field label="Question / title"><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description (optional)"><Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="row-fields">
            <Field label="Answer type">
              <Select value={form.input_type} onChange={(e) => setForm({ ...form, input_type: e.target.value })}>
                {INPUT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="Audience">
              <Select value={form.audience} onChange={(e) => { setForm({ ...form, audience: e.target.value }); setTargets([]); }}>
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </Select>
            </Field>
          </div>
          <label className="hstack" style={{ fontSize: 14, cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={!!form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} /> Required
          </label>

          {needsStudents && (
            <Field label={`Select students (${targets.length})`}>
              <div className="list" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {students.map((s) => (
                  <label key={s.id} className="row" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={targets.includes(s.id)} onChange={() => toggleTarget(s.id)} />
                    <span className="grow">{s.name} <span style={{ color: 'var(--muted)' }}>· {s.email}</span></span>
                  </label>
                ))}
              </div>
            </Field>
          )}
          {needsTeams && (
            <Field label={`Select teams (${targets.length})${form.audience === 'team_spoc' ? ' — leave empty for all SPOCs' : ''}`}>
              <div className="list" style={{ maxHeight: 220, overflowY: 'auto' }}>
                {teams.map((t) => (
                  <label key={t.id} className="row" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={targets.includes(t.id)} onChange={() => toggleTarget(t.id)} />
                    <span className="grow">{t.name} <span style={{ color: 'var(--muted)' }}>· {t.members.length} members</span></span>
                  </label>
                ))}
              </div>
            </Field>
          )}
        </Modal>
      )}

      {answersFor && (
        <Modal title={`Answers · ${answersFor.title}`} wide onClose={() => setAnswersFor(null)}>
          {answers.length === 0 ? (
            <Empty icon="📭" title="No responses yet" />
          ) : (
            <div className="vstack">
              {answers.map((a) => (
                <div className="row" key={a.id} style={{ borderRadius: 10 }}>
                  <div className="grow">
                    <div className="title">{a.student_name} {a.team_name && <Badge color="purple">{a.team_name}</Badge>}</div>
                    <div className="desc" style={{ whiteSpace: 'pre-wrap' }}>
                      {a.file_url ? <a href={a.file_url} target="_blank" rel="noreferrer">📎 {a.file_name || 'Download file'}</a>
                        : a.value_number != null ? a.value_number
                        : (a.value_text || <em>—</em>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </Layout>
  );
}
