'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

// ============================================================
// TYPES
// ============================================================
interface HoloAgent {
  code: string;
  persona: string;
  pillar: string;
  complexity: string;
  role: string;
  detail: string;
  value: number;
  priority: number;
  templateFamily: string;
  capabilities: string[];
  icon: string;
  pillarIcon: string;
}

interface AgentRosterData {
  pillars: string[];
  roles: string[];
  complexities: string[];
  details: string[];
  pillarFamilies: Record<string, string>;
  roleCaps: Record<string, string[]>;
  roleIcons: Record<string, string>;
  agents: Array<[string, string, number, number, number, number, number, number]>;
}

interface BuddyAssignment {
  agent: HoloAgent;
  matchScore: number;
  matchReasons: string[];
  business: string;
}

// ============================================================
// BUSINESS MAPPING — all 3 core businesses
// ============================================================
const BUSINESSES = [
  { id: 'workfamilyai', name: 'WorkFamilyAI', desc: 'AI workforce augmentation platform', color: '#6c63ff', pillars: ['Product', 'Sales & RevOps', 'Marketing', 'Support', 'Innovation'] },
  { id: 'tech4humanity', name: 'Tech4Humanity', desc: 'Ethical technology consulting & IP', color: '#00c853', pillars: ['Governance', 'Innovation', 'Community', 'People', 'Execution Engine'] },
  { id: 'neuralennead', name: 'Neural Ennead', desc: 'AI systems architecture & deployment', color: '#ff6b6b', pillars: ['Execution Engine', 'Product', 'Finance & Ops', 'Innovation', 'Governance'] },
];

const PILLAR_ICONS: Record<string, string> = {
  'Product': '🔧', 'Marketing': '📢', 'People': '👤', 'Finance & Ops': '💰',
  'Support': '🎯', 'Innovation': '🚀', 'Sales & RevOps': '💎', 'Governance': '⚖️',
  'Community': '🤝', 'Execution Engine': '⚡',
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function BuddyPage() {
  const [agents, setAgents] = useState<HoloAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPillar, setFilterPillar] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterBiz, setFilterBiz] = useState<string>('all');
  const [filterComplexity, setFilterComplexity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'value' | 'name'>('priority');
  const [selectedAgent, setSelectedAgent] = useState<HoloAgent | null>(null);
  const [page, setPage] = useState(0);
  const [view, setView] = useState<'roster' | 'buddy' | 'stats'>('roster');
  const [buddyGoal, setBuddyGoal] = useState('');
  const [buddyResults, setBuddyResults] = useState<BuddyAssignment[]>([]);

  const PAGE_SIZE = 50;

  // Load agents from public JSON
  useEffect(() => {
    fetch('/agents.json')
      .then(r => r.json())
      .then((data: AgentRosterData) => {
        const expanded: HoloAgent[] = data.agents.map(a => ({
          code: a[0],
          persona: a[1],
          pillar: data.pillars[a[2]],
          complexity: data.complexities[a[3]],
          role: data.roles[a[4]],
          detail: data.details[a[7]],
          value: a[5],
          priority: a[6],
          templateFamily: data.pillarFamilies[data.pillars[a[2]]] || 'operations',
          capabilities: data.roleCaps[data.roles[a[4]]] || ['general_support'],
          icon: data.roleIcons[data.roles[a[4]]] || '🤖',
          pillarIcon: PILLAR_ICONS[data.pillars[a[2]]] || '📦',
        }));
        setAgents(expanded);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filtered + sorted agents
  const filtered = useMemo(() => {
    let list = [...agents];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(a =>
        a.persona.toLowerCase().includes(s) ||
        a.role.toLowerCase().includes(s) ||
        a.detail.toLowerCase().includes(s) ||
        a.code.toLowerCase().includes(s) ||
        a.capabilities.some(c => c.replace('_', ' ').includes(s))
      );
    }
    if (filterPillar !== 'all') list = list.filter(a => a.pillar === filterPillar);
    if (filterRole !== 'all') list = list.filter(a => a.role === filterRole);
    if (filterComplexity !== 'all') list = list.filter(a => a.complexity === filterComplexity);
    if (filterBiz !== 'all') {
      const biz = BUSINESSES.find(b => b.id === filterBiz);
      if (biz) list = list.filter(a => biz.pillars.includes(a.pillar));
    }
    list.sort((a, b) => {
      if (sortBy === 'priority') return a.priority - b.priority;
      if (sortBy === 'value') return b.value - a.value;
      return a.persona.localeCompare(b.persona);
    });
    return list;
  }, [agents, search, filterPillar, filterRole, filterBiz, filterComplexity, sortBy]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const pillars = useMemo(() => Array.from(new Set(agents.map(a => a.pillar))).sort(), [agents]);
  const roles = useMemo(() => Array.from(new Set(agents.map(a => a.role))).sort(), [agents]);

  // Buddy matching engine
  const findBuddies = useCallback(() => {
    if (!buddyGoal.trim()) return;
    const lower = buddyGoal.toLowerCase();
    const keywords = lower.split(/[\s,;]+/).filter(w => w.length > 2);

    const scored: BuddyAssignment[] = agents.map(agent => {
      let score = 0;
      const reasons: string[] = [];

      // Match against capabilities
      for (const cap of agent.capabilities) {
        const capWords = cap.replace(/_/g, ' ').split(' ');
        for (const kw of keywords) {
          if (capWords.some(cw => cw.includes(kw) || kw.includes(cw))) {
            score += 20;
            reasons.push(`Capability: ${cap.replace(/_/g, ' ')}`);
          }
        }
      }

      // Match against role
      const roleLower = agent.role.toLowerCase();
      for (const kw of keywords) {
        if (roleLower.includes(kw)) { score += 15; reasons.push(`Role: ${agent.role}`); }
      }

      // Match against detail
      const detailLower = agent.detail.toLowerCase();
      for (const kw of keywords) {
        if (detailLower.includes(kw)) { score += 10; reasons.push(`Skill: ${kw}`); }
      }

      // Boost high-value agents
      score += agent.value;

      // Boost low priority number (higher actual priority)
      if (agent.priority < 200) score += 5;

      // Determine business fit
      const bizFit = BUSINESSES.filter(b => b.pillars.includes(agent.pillar));
      const business = bizFit.length > 0 ? bizFit.map(b => b.name).join(', ') : 'Cross-Business';

      return { agent, matchScore: score, matchReasons: Array.from(new Set(reasons)), business };
    }).filter(s => s.matchScore > 5);

    scored.sort((a, b) => b.matchScore - a.matchScore);
    setBuddyResults(scored.slice(0, 20));
  }, [buddyGoal, agents]);

  // Stats
  const stats = useMemo(() => {
    const byPillar: Record<string, number> = {};
    const byRole: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};
    const byBusiness: Record<string, number> = {};
    const byValue: Record<number, number> = {};

    for (const a of agents) {
      byPillar[a.pillar] = (byPillar[a.pillar] || 0) + 1;
      byRole[a.role] = (byRole[a.role] || 0) + 1;
      byComplexity[a.complexity] = (byComplexity[a.complexity] || 0) + 1;
      byValue[a.value] = (byValue[a.value] || 0) + 1;
      for (const b of BUSINESSES) {
        if (b.pillars.includes(a.pillar)) byBusiness[b.name] = (byBusiness[b.name] || 0) + 1;
      }
    }
    return { byPillar, byRole, byComplexity, byBusiness, byValue };
  }, [agents]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-400">Loading 1,000 HoloOrg agents...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#0d0d20]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="text-gray-400 hover:text-white text-sm">← WorkFamilyAI</a>
            <span className="text-gray-600">|</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Virtual Help & Buddy System
            </h1>
            <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">
              {agents.length} agents
            </span>
          </div>
          <div className="flex gap-2">
            {(['roster', 'buddy', 'stats'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === v ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                {v === 'roster' ? '📋 Roster' : v === 'buddy' ? '🤝 Find Buddy' : '📊 Stats'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ============ ROSTER VIEW ============ */}
        {view === 'roster' && (
          <div>
            {/* Search & Filters */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
              <input type="text" placeholder="Search agents, roles, skills..." value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="md:col-span-2 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:border-purple-500 focus:outline-none" />
              <select value={filterBiz} onChange={e => { setFilterBiz(e.target.value); setPage(0); }}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="all">All Businesses</option>
                {BUSINESSES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select value={filterPillar} onChange={e => { setFilterPillar(e.target.value); setPage(0); }}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="all">All Pillars</option>
                {pillars.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(0); }}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="all">All Roles</option>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="priority">Sort: Priority</option>
                <option value="value">Sort: Value</option>
                <option value="name">Sort: Name</option>
              </select>
            </div>

            {/* Results count */}
            <p className="text-gray-400 text-sm mb-3">{filtered.length} agents found — page {page + 1}/{totalPages}</p>

            {/* Agent cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {paged.map(a => (
                <div key={a.code} onClick={() => setSelectedAgent(a)}
                  className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-purple-500/50 hover:bg-gray-900 transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{a.persona}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${a.value === 10 ? 'bg-green-500/20 text-green-300' : a.value === 7 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-700 text-gray-400'}`}>
                          V{a.value}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{a.role}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.detail}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">{a.pillarIcon} {a.pillar}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${a.complexity === 'High' ? 'bg-red-500/20 text-red-300' : a.complexity === 'Medium' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                          {a.complexity}
                        </span>
                        <span className="text-xs text-gray-600">#{a.priority}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30">← Prev</button>
                <span className="text-gray-400 text-sm">Page {page + 1} of {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                  className="px-4 py-2 bg-gray-800 rounded-lg text-sm disabled:opacity-30">Next →</button>
              </div>
            )}
          </div>
        )}

        {/* ============ BUDDY FINDER VIEW ============ */}
        {view === 'buddy' && (
          <div>
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-bold mb-2">🤝 Find Your AI Buddy</h2>
              <p className="text-gray-400 text-sm mb-4">
                Describe what you need help with and we'll match you with the best virtual agents from the HoloOrg roster.
                These agents work across all 3 businesses: WorkFamilyAI, Tech4Humanity, and Neural Ennead.
              </p>
              <div className="flex gap-3">
                <input type="text" placeholder="e.g. help me close more deals, manage compliance, build community engagement..."
                  value={buddyGoal} onChange={e => setBuddyGoal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && findBuddies()}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:outline-none" />
                <button onClick={findBuddies}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-all">
                  Match Buddies
                </button>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {['close deals', 'hiring and recruitment', 'compliance and governance', 'community engagement', 'financial analysis', 'product roadmap', 'customer support', 'innovation prototyping'].map(q => (
                  <button key={q} onClick={() => { setBuddyGoal(q); }}
                    className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-gray-300 transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {buddyResults.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-3">Top {buddyResults.length} matches for "{buddyGoal}"</h3>
                <div className="space-y-3">
                  {buddyResults.map((b, i) => (
                    <div key={b.agent.code} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 hover:border-purple-500/30 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="text-center">
                          <div className="text-3xl mb-1">{b.agent.icon}</div>
                          <div className="text-xs font-mono text-gray-500">#{i + 1}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold">{b.agent.persona}</span>
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">Score: {b.matchScore}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${b.agent.value === 10 ? 'bg-green-500/20 text-green-300' : b.agent.value === 7 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-700 text-gray-400'}`}>
                              Value {b.agent.value}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300">{b.agent.role} — {b.agent.pillar}</p>
                          <p className="text-xs text-gray-500 mt-1">{b.agent.detail}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {b.matchReasons.slice(0, 5).map((r, ri) => (
                              <span key={ri} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">✓ {r}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">Business fit:</span>
                            <span className="text-xs text-purple-300">{b.business}</span>
                            <span className="text-xs text-gray-600">|</span>
                            <span className={`text-xs ${b.agent.complexity === 'High' ? 'text-red-300' : b.agent.complexity === 'Medium' ? 'text-orange-300' : 'text-blue-300'}`}>
                              {b.agent.complexity} complexity
                            </span>
                            <span className="text-xs text-gray-600">|</span>
                            <span className="text-xs text-gray-400">Priority #{b.agent.priority}</span>
                          </div>
                        </div>
                        <button onClick={() => setSelectedAgent(b.agent)}
                          className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg text-xs transition-all">
                          View Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ STATS VIEW ============ */}
        {view === 'stats' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business allocation */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">🏢 Business Allocation</h3>
              {BUSINESSES.map(b => {
                const count = stats.byBusiness[b.name] || 0;
                return (
                  <div key={b.id} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{b.name}</span>
                      <span className="text-gray-400">{count} agents</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(count / agents.length) * 100}%`, backgroundColor: b.color }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{b.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Pillar breakdown */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">🏗️ Pillar Breakdown</h3>
              {Object.entries(stats.byPillar).sort((a, b) => b[1] - a[1]).map(([p, c]) => (
                <div key={p} className="flex items-center gap-3 mb-2">
                  <span className="text-lg">{PILLAR_ICONS[p] || '📦'}</span>
                  <span className="flex-1 text-sm">{p}</span>
                  <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(c / agents.length) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{c}</span>
                </div>
              ))}
            </div>

            {/* Role distribution */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">👤 Role Distribution</h3>
              {Object.entries(stats.byRole).sort((a, b) => b[1] - a[1]).map(([r, c]) => (
                <div key={r} className="flex items-center justify-between mb-2">
                  <span className="text-sm">{r}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(c / agents.length) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-8 text-right">{c}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Complexity & Value */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h3 className="font-bold mb-4">⚡ Complexity & Value</h3>
              <div className="mb-4">
                <h4 className="text-sm text-gray-400 mb-2">Complexity</h4>
                {Object.entries(stats.byComplexity).map(([c, n]) => (
                  <div key={c} className="flex items-center gap-3 mb-2">
                    <span className={`text-sm w-16 ${c === 'High' ? 'text-red-300' : c === 'Medium' ? 'text-orange-300' : 'text-blue-300'}`}>{c}</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c === 'High' ? 'bg-red-500' : c === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`}
                        style={{ width: `${(n / agents.length) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{n}</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm text-gray-400 mb-2">Value Score</h4>
                {Object.entries(stats.byValue).sort((a, b) => Number(b[0]) - Number(a[0])).map(([v, n]) => (
                  <div key={v} className="flex items-center gap-3 mb-2">
                    <span className={`text-sm w-16 ${Number(v) === 10 ? 'text-green-300' : Number(v) === 7 ? 'text-yellow-300' : 'text-gray-300'}`}>Score {v}</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${Number(v) === 10 ? 'bg-green-500' : Number(v) === 7 ? 'bg-yellow-500' : 'bg-gray-500'}`}
                        style={{ width: `${(n / agents.length) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-10 text-right">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============ AGENT DETAIL MODAL ============ */}
        {selectedAgent && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAgent(null)}>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">{selectedAgent.icon}</div>
                <div>
                  <h2 className="text-xl font-bold">{selectedAgent.persona}</h2>
                  <p className="text-gray-400">{selectedAgent.role}</p>
                  <p className="text-xs text-gray-500 font-mono">{selectedAgent.code}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 mb-4">{selectedAgent.detail}</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Pillar</p>
                  <p className="text-sm">{selectedAgent.pillarIcon} {selectedAgent.pillar}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Complexity</p>
                  <p className={`text-sm ${selectedAgent.complexity === 'High' ? 'text-red-300' : selectedAgent.complexity === 'Medium' ? 'text-orange-300' : 'text-blue-300'}`}>{selectedAgent.complexity}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Value Score</p>
                  <p className="text-sm">{selectedAgent.value}/10</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Priority</p>
                  <p className="text-sm">#{selectedAgent.priority}</p>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.capabilities.map(c => (
                    <span key={c} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">{c.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Business Assignments</p>
                <div className="flex flex-wrap gap-1.5">
                  {BUSINESSES.filter(b => b.pillars.includes(selectedAgent.pillar)).map(b => (
                    <span key={b.id} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: b.color + '33', color: b.color }}>{b.name}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/?assign=${selectedAgent.code}`}
                  className="flex-1 text-center px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition-all">
                  Deploy as WorkFamilyAI Agent
                </a>
                <button onClick={() => setSelectedAgent(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-all">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
