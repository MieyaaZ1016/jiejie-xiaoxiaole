'use client';
import { useEffect, useState } from 'react';
import * as store from '@/lib/store';
import * as ans from '@/lib/answers';
import { toast, sfx } from '@/lib/ui';

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [busy, setBusy] = useState(false);

  const voter = store.voterId();
  const aiEnabled = !!store.get().ai.enabled;

  async function fetchPosts() {
    try {
      const r = await fetch('/api/community?voter=' + encodeURIComponent(voter));
      const j = await r.json();
      setPosts(j.posts || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPosts(); /* eslint-disable-next-line */ }, []);

  async function addPost() {
    const q = newPost.trim();
    if (!q || busy) return;
    setBusy(true);
    let opts;
    try { opts = await ans.generatePollOptions(q, aiEnabled); }
    catch { opts = ['选这个', '选那个']; }
    try {
      const r = await fetch('/api/community', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, optA: opts[0], optB: opts[1] }),
      });
      const j = await r.json();
      if (j.post) setPosts((prev) => [j.post, ...prev]);
      setNewPost('');
      sfx.tick(); toast('已发布');
    } catch (e) {
      toast('发布失败：' + (e.message || ''));
    } finally {
      setBusy(false);
    }
  }

  async function vote(post, i) {
    if (post.myVote !== null && post.myVote !== undefined) return;
    // 乐观更新
    setPosts((prev) => prev.map((p) => {
      if (p.id !== post.id) return p;
      const v = [...p.v];
      v[i] = Math.min(95, v[i] + 6); v[1 - i] = 100 - v[i];
      return { ...p, v, myVote: i };
    }));
    store.recordVote(post.id, i);
    sfx.tick(); toast('投票成功');
    try {
      const r = await fetch('/api/community/vote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, choice: i, voter }),
      });
      const j = await r.json();
      if (j.db && j.v) {
        setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, v: j.v, total: j.total, myVote: i } : p)));
      }
    } catch {}
  }

  return (
    <>
      <div className="card">
        <div className="sectionTitle"><b>纠结社区</b><span>广场投票</span></div>
        <div className="askBox">
          <input value={newPost} onChange={(e) => setNewPost(e.target.value)}
            placeholder="发起一个纠结：比如今晚要不要出门？"
            onKeyDown={(e) => { if (e.key === 'Enter') addPost(); }} />
          <button onClick={addPost} disabled={busy}>{busy ? '生成选项…' : '发布'}</button>
        </div>
      </div>
      <div className="feed">
        {loading ? <div className="card"><p className="empty">加载中…</p></div> :
          posts.map((p) => {
            const voted = p.myVote !== null && p.myVote !== undefined;
            return (
              <div className="post" key={p.id}>
                <h3>{p.q}</h3>
                <div className="meta">{voted ? '已投票' : '等你投票'} · {p.total} 人参与</div>
                {p.a.map((opt, i) => (
                  <div className="vote" key={i}>
                    <div className={'voteBtn' + (p.myVote === i ? ' voted' : '')} onClick={() => vote(p, i)}>
                      <span>{opt}</span><b>{p.v[i]}%</b>
                    </div>
                    <div className="bar"><i style={{ width: p.v[i] + '%' }}></i></div>
                  </div>
                ))}
              </div>
            );
          })}
      </div>
    </>
  );
}
