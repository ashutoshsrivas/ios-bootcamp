import { useEffect, useState } from 'react';
import { useRequireRole } from '../../lib/auth';
import { useBootcamp, scoped } from '../../lib/bootcamp';
import { api } from '../../lib/api';
import Layout, { PageHead } from '../../components/Layout';
import { Card, Button, Loading, useToast, Badge, Avatar, Select, Input, Empty } from '../../components/UI';

export default function MentorAssess() {
  const { ok } = useRequireRole(['mentor']);
  const { bootcampId } = useBootcamp() || {};
  const toast = useToast();
  const [rubrics, setRubrics] = useState(null);
  const [teams, setTeams] = useState([]);
  const [rubricId, setRubricId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [detail, setDetail] = useState(null); // { rubric, students }
  const [scores, setScores] = useState({}); // `${studentId}:${critId}` -> {score, comment}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ok || !bootcampId) return;
    Promise.all([api.get(scoped('/api/rubrics', bootcampId)), api.get(scoped('/api/teams', bootcampId))])
      .then(([r, t]) => { setRubrics(r); setTeams(t); })
      .catch((e) => toast.err(e.message));
  }, [ok, bootcampId]);

  const loadScores = async (rid, tid) => {
    if (!rid || !tid) { setDetail(null); return; }
    try {
      const data = await api.get(`/api/rubrics/${rid}/scores?team=${tid}`);
      setDetail(data);
      const map = {};
      data.scores.forEach((s) => { map[`${s.student_id}:${s.criteria_id}`] = { score: s.score, comment: s.comment || '' }; });
      setScores(map);
    } catch (e) { toast.err(e.message); }
  };

  const onRubric = (v) => { setRubricId(v); loadScores(v, teamId); };
  const onTeam = (v) => { setTeamId(v); loadScores(rubricId, v); };
  const setCell = (sid, cid, key, val) => setScores((m) => ({ ...m, [`${sid}:${cid}`]: { ...m[`${sid}:${cid}`], [key]: val } }));

  const save = async () => {
    setBusy(true);
    try {
      const payload = [];
      detail.students.forEach((s) => {
        detail.rubric.criteria.forEach((c) => {
          const cell = scores[`${s.id}:${c.id}`];
          if (cell && cell.score !== '' && cell.score != null) {
            payload.push({ criteria_id: c.id, student_id: s.id, score: cell.score, comment: cell.comment || '' });
          }
        });
      });
      await api.post(`/api/rubrics/${rubricId}/scores`, { team_id: Number(teamId), scores: payload });
      toast.ok('Scores saved');
    } catch (e) { toast.err(e.message); }
    setBusy(false);
  };

  if (!ok || !rubrics) return <Layout><Loading /></Layout>;

  return (
    <Layout>
      <PageHead title="Assessment" subtitle="Score students against a rubric — you can assess any team" />

      <Card>
        <div className="row-fields">
          <div className="field">
            <label>Rubric</label>
            <Select value={rubricId} onChange={(e) => onRubric(e.target.value)}>
              <option value="">Choose a rubric…</option>
              {rubrics.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </Select>
          </div>
          <div className="field">
            <label>Team</label>
            <Select value={teamId} onChange={(e) => onTeam(e.target.value)}>
              <option value="">Choose a team…</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.members.length})</option>)}
            </Select>
          </div>
        </div>
      </Card>

      {rubrics.length === 0 && <Card><Empty icon="📋" title="No rubrics" subtitle="Ask an admin to create a rubric." /></Card>}

      {detail && (
        detail.students.length === 0 ? (
          <Card><Empty icon="🧑‍🎓" title="No students on this team" /></Card>
        ) : (
          <>
            {detail.students.map((s) => (
              <Card key={s.id}>
                <div className="hstack" style={{ marginBottom: 12 }}>
                  <Avatar name={s.name} id={s.id} />
                  <div className="grow"><div className="title">{s.name}</div><div className="desc">{s.email}</div></div>
                </div>
                <div className="vstack">
                  {detail.rubric.criteria.map((c) => {
                    const cell = scores[`${s.id}:${c.id}`] || {};
                    return (
                      <div className="hstack" key={c.id} style={{ gap: 10 }}>
                        <div style={{ flex: 2 }}>
                          {c.name} <Badge color="gray">/{c.max_score}</Badge>
                        </div>
                        <Input style={{ flex: 1 }} type="number" min={0} max={c.max_score} placeholder="Score"
                          value={cell.score ?? ''} onChange={(e) => setCell(s.id, c.id, 'score', e.target.value)} />
                        <Input style={{ flex: 2 }} placeholder="Comment (optional)"
                          value={cell.comment ?? ''} onChange={(e) => setCell(s.id, c.id, 'comment', e.target.value)} />
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
            <Button variant="primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save scores'}</Button>
          </>
        )
      )}
    </Layout>
  );
}
