'use client';
import React, { useState, useEffect, useCallback } from 'react';

/* ─── Types ───────────────────────────────────────────── */
interface Product {
  id: string; name: string; category: string; tier: string | null;
  base_price: number; description: string; delivery_method: string | null;
  target_audience: string | null; customer_outcome: string | null;
  engagement_model: string | null; tags: string[] | null;
  stripe_product_id: string | null; stripe_price_id: string | null;
}
interface CategoryStat { category: string; cnt: number; min_price: number; max_price: number; }
interface CartItem { product: Product; qty: number; }

/* ─── Icon components ─────────────────────────────────── */
const Icons = {
  Bot: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="3"/><line x1="12" y1="8" x2="12" y2="11"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></svg>,
  Shield: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Zap: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  Cart: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Arrow: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 inline"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
  Check: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5"><polyline points="20 6 9 17 4 12"/></svg>,
  X: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Globe: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Headphones: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>,
};

/* ─── Category icon mapping ───────────────────────────── */
const catIcons: Record<string, string> = {
  'Strategic AI': '🧠', 'Training AI': '🎓', 'Process AI': '⚙️', 'Analytics AI': '📊',
  'Risk Management': '🛡️', 'Voice AI': '🎙️', 'HR AI': '👥', 'Marketing AI': '📣',
  'Customer Experience': '💬', 'Operations': '🔧', 'Governance & Compliance': '📋',
  'Platform AI': '🌐', 'Productivity AI': '⚡', 'Bundle': '📦', 'Product': '🏷️',
  'Service': '🔨', 'Hardware': '💻', 'Support': '🛟', 'Consulting': '💼',
  'Training': '📚', 'Package Extra': '➕', 'Analytics & Intelligence': '🔍',
  'Strategy & Consulting': '🎯', 'Process Automation': '🤖',
};

const tierColors: Record<string, string> = {
  Core: 'bg-blue-100 text-blue-700', Premium: 'bg-purple-100 text-purple-700',
  Enterprise: 'bg-amber-100 text-amber-700',
};

function formatPrice(p: number) {
  if (p >= 1000) return `$${(p/1000).toFixed(p%1000===0?0:1)}K`;
  return `$${p.toFixed(p%1===0?0:2)}`;
}

/* ═══════════════════════════════════════════════════════ */
/*  MAIN APP                                              */
/* ═══════════════════════════════════════════════════════ */
export default function Home() {
  const [view, setView] = useState<'landing'|'catalog'|'configure'|'cart'|'dashboard'>('landing');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selCat, setSelCat] = useState<string|null>(null);
  const [selTier, setSelTier] = useState<string|null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product|null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [contractData, setContractData] = useState({ company: '', email: '', name: '', sla: 'standard' });
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const fetchCatalog = useCallback(async (cat?: string|null, tier?: string|null, q?: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat) params.set('category', cat);
    if (tier) params.set('tier', tier);
    if (q) params.set('q', q);
    try {
      const r = await fetch(`/api/catalog?${params}`);
      const data = await r.json();
      if (data.success) {
        setProducts(data.products || []);
        if (data.categories) setCategories(data.categories);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { if (view === 'catalog') fetchCatalog(selCat, selTier, search); }, [view, selCat, selTier]);

  const addToCart = (p: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === p.id);
      if (existing) return prev.map(c => c.product.id === p.id ? {...c, qty: c.qty+1} : c);
      return [...prev, { product: p, qty: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(c => c.product.id !== id));
  const cartTotal = cart.reduce((s, c) => s + c.product.base_price * c.qty, 0);

  const submitOrder = async () => {
    setSubmitting(true);
    try {
      const orderRes = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: contractData.email, name: contractData.name,
          company: contractData.company, request_type: 'agent_contract',
          payload: { items: cart.map(c => ({ id: c.product.id, name: c.product.name, qty: c.qty, price: c.product.base_price })), sla: contractData.sla, total: cartTotal },
        }),
      });
      const orderData = await orderRes.json();
      if (orderData.success && orderData.customer_id) {
        const contractRes = await fetch('/api/contracts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: orderData.customer_id,
            contract: { items: cart.map(c => ({ id: c.product.id, name: c.product.name, category: c.product.category, tier: c.product.tier, qty: c.qty, unit_price: c.product.base_price })), total_aud: cartTotal, sla: contractData.sla, company: contractData.company, state: 'requested' },
          }),
        });
        const contractData2 = await contractRes.json();
        setOrderResult({ order_id: orderData.order_id, contract_id: contractData2.contract_id, customer_id: orderData.customer_id });
        setView('dashboard');
      }
    } catch(e) { console.error(e); }
    setSubmitting(false);
  };

  /* ─── RENDER ────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/90 backdrop-blur border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => { setView('landing'); setSelectedProduct(null); }} className="flex items-center gap-3">
            <img src="/droid-head.webp" alt="WF" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">WorkFamilyAI</span>
          </button>
          <div className="flex items-center gap-6">
            <button onClick={() => setView('catalog')} className={`text-sm font-medium transition ${view==='catalog' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}>Catalog</button>
            <button onClick={() => setView('configure')} className={`text-sm font-medium transition ${view==='configure' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}>Configure</button>
            <a href="/buddy" className="text-sm font-medium text-gray-400 hover:text-white transition">Buddy</a>
            <button onClick={() => setView('cart')} className="relative text-gray-400 hover:text-white transition">
              <Icons.Cart />
              {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-cyan-500 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{cart.length}</span>}
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {view === 'landing' && <LandingView onBrowse={() => setView('catalog')} onConfigure={() => setView('configure')} categories={categories} fetchCatalog={fetchCatalog} setSelCat={setSelCat} setView={setView} />}
        {view === 'catalog' && <CatalogView products={products} categories={categories} loading={loading} search={search} setSearch={setSearch} selCat={selCat} setSelCat={setSelCat} selTier={selTier} setSelTier={setSelTier} fetchCatalog={fetchCatalog} addToCart={addToCart} cart={cart} selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} />}
        {view === 'cart' && <CartView cart={cart} removeFromCart={removeFromCart} cartTotal={cartTotal} onCheckout={() => { setWizardStep(0); setView('configure'); }} />}
        {view === 'configure' && <ConfigureView cart={cart} cartTotal={cartTotal} wizardStep={wizardStep} setWizardStep={setWizardStep} contractData={contractData} setContractData={setContractData} submitting={submitting} submitOrder={submitOrder} onBrowse={() => setView('catalog')} />}
        {view === 'dashboard' && <DashboardView orderResult={orderResult} cart={cart} contractData={contractData} cartTotal={cartTotal} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src="/droid-head.webp" alt="" className="w-6 h-6 rounded" />
            <span className="text-sm text-gray-500">© 2026 WorkFamilyAI · Tech4Humanity · Neural Ennead</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <span>238 Products</span><span>·</span><span>25 Categories</span><span>·</span><span>1,000+ AI Agents</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  LANDING VIEW                                          */
/* ═══════════════════════════════════════════════════════ */
function LandingView({ onBrowse, onConfigure, categories, fetchCatalog, setSelCat, setView }: any) {
  useEffect(() => { if (categories.length === 0) fetchCatalog(); }, []);

  const aiCategories = (categories as CategoryStat[]).filter(c => !['Product','Service','Hardware','Support','Consulting','Training','Surcharge','Package Extra','Bundle'].includes(c.category));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/40 via-gray-950 to-blue-950/40" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-6 py-32 md:py-40">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Live — 238 Products · 1,000 Agents
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
                One-Click<br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">AI Augmentation</span>
              </h1>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-lg">
                Browse. Select. Contract. Deploy. The only platform that accepts and executes AI agent contracts — from $9/month to enterprise scale.
              </p>
              <div className="flex flex-wrap gap-4">
                <button onClick={onBrowse} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
                  Browse Catalog <Icons.Arrow />
                </button>
                <button onClick={onConfigure} className="px-8 py-4 border border-white/10 rounded-xl font-semibold text-lg hover:bg-white/5 transition">
                  Build Contract
                </button>
              </div>
            </div>
            <div className="hidden md:block">
              <img src="/neural-ennead-family.png" alt="Neural Ennead" className="w-full rounded-2xl shadow-2xl shadow-cyan-500/10 border border-white/5" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">Four steps from browsing to deployed AI agents working for your business.</p>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { n: '01', title: 'Browse', desc: '238 AI products across 25 categories. Filter by need, budget, or industry.', icon: <Icons.Search /> },
              { n: '02', title: 'Select & Configure', desc: 'Add agents to your cart. Pick SLA tier. Customize for your workflow.', icon: <Icons.Bot /> },
              { n: '03', title: 'Contract & Pay', desc: 'We compile your contract, validate it, and process payment via Stripe.', icon: <Icons.Shield /> },
              { n: '04', title: 'Deploy & Support', desc: 'Agents go live in your environment. Buddy support included.', icon: <Icons.Zap /> },
            ].map((s, i) => (
              <div key={i} className="relative group">
                <div className="absolute -top-3 -left-3 text-6xl font-black text-white/[0.03] group-hover:text-cyan-500/10 transition">{s.n}</div>
                <div className="relative bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-cyan-500/20 transition-all hover:bg-white/[0.04]">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-6">{s.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Categories Grid */}
      <section className="py-24 px-6 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">AI Agent Categories</h2>
          <p className="text-gray-400 text-center mb-16 max-w-2xl mx-auto">Enterprise-grade AI across every business function. Real products, real prices, real contracts.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {aiCategories.map((c: CategoryStat) => (
              <button key={c.category} onClick={() => { setSelCat(c.category); setView('catalog'); }}
                className="group text-left bg-white/[0.02] border border-white/5 rounded-xl p-6 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{catIcons[c.category] || '🤖'}</span>
                  <span className="font-semibold group-hover:text-cyan-400 transition">{c.category}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{c.cnt} product{c.cnt > 1 ? 's' : ''}</span>
                  <span>{formatPrice(c.min_price)} – {formatPrice(c.max_price)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiator */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">The Only Platform That Executes</h2>
          <p className="text-xl text-gray-400 mb-16 max-w-3xl mx-auto">Other sites showcase. We contract. Your agents are compiled, validated, and deployed through a 9-state machine — from <code className="text-cyan-400">requested</code> to <code className="text-cyan-400">live</code>.</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['requested','interpreted','compiled','validated','approved','staged','live','paused','retired'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span className={`px-4 py-2 rounded-lg text-sm font-mono font-medium ${i < 7 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>{s}</span>
                {i < 8 && <span className="text-gray-600">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-business */}
      <section className="py-24 px-6 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'WorkFamilyAI', desc: 'Agent marketplace & contract execution', color: 'from-cyan-500 to-blue-500' },
              { name: 'Tech4Humanity', desc: 'Research artefacts & sweet spot assessments', color: 'from-blue-500 to-purple-500' },
              { name: 'Neural Ennead', desc: '1,000 specialist agents across 10 pillars', color: 'from-purple-500 to-pink-500' },
            ].map(b => (
              <div key={b.name} className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 hover:border-white/10 transition">
                <div className={`w-12 h-1 rounded-full bg-gradient-to-r ${b.color} mb-6`} />
                <h3 className="text-xl font-bold mb-3">{b.name}</h3>
                <p className="text-gray-400">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Augment?</h2>
          <p className="text-xl text-gray-400 mb-10">From a $9/month personal scaffold to $175K enterprise deployments. Start now.</p>
          <button onClick={onBrowse} className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
            Explore the Full Catalog <Icons.Arrow />
          </button>
        </div>
      </section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  CATALOG VIEW                                          */
/* ═══════════════════════════════════════════════════════ */
function CatalogView({ products, categories, loading, search, setSearch, selCat, setSelCat, selTier, setSelTier, fetchCatalog, addToCart, cart, selectedProduct, setSelectedProduct }: any) {
  const doSearch = () => fetchCatalog(selCat, selTier, search);

  if (selectedProduct) return (
    <ProductDetail product={selectedProduct} onBack={() => setSelectedProduct(null)} addToCart={addToCart} inCart={cart.some((c: CartItem) => c.product.id === selectedProduct.id)} />
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><Icons.Search /></div>
          <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && doSearch()}
            placeholder="Search agents, categories, capabilities..."
            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-500/50" />
        </div>
        <button onClick={doSearch} className="px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition font-medium">Search</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button onClick={() => setSelCat(null)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${!selCat ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>All</button>
        {(categories as CategoryStat[]).filter(c => c.cnt > 1).map(c => (
          <button key={c.category} onClick={() => setSelCat(c.category === selCat ? null : c.category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selCat === c.category ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
            {catIcons[c.category] || '🤖'} {c.category} ({c.cnt})
          </button>
        ))}
      </div>

      {/* Tier filter */}
      <div className="flex gap-2 mb-8">
        {['Core','Premium','Enterprise'].map(t => (
          <button key={t} onClick={() => setSelTier(t === selTier ? null : t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selTier === t ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading catalog...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(products as Product[]).map(p => (
            <div key={p.id} className="group bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-cyan-500/20 hover:bg-white/[0.04] transition-all cursor-pointer" onClick={() => setSelectedProduct(p)}>
              <div className="flex items-start justify-between mb-4">
                <span className="text-2xl">{catIcons[p.category] || '🤖'}</span>
                {p.tier && <span className={`px-3 py-1 rounded-full text-xs font-medium ${tierColors[p.tier] || 'bg-gray-100 text-gray-700'}`}>{p.tier}</span>}
              </div>
              <h3 className="font-semibold text-lg mb-2 group-hover:text-cyan-400 transition">{p.name}</h3>
              <p className="text-sm text-gray-400 mb-4 line-clamp-2">{p.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-cyan-400">{formatPrice(p.base_price)}</span>
                <span className="text-xs text-gray-500">{p.category}</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); addToCart(p); }}
                className="mt-4 w-full py-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl text-sm font-medium hover:bg-cyan-500/20 transition">
                + Add to Contract
              </button>
            </div>
          ))}
        </div>
      )}
      {!loading && products.length === 0 && <div className="text-center py-20 text-gray-500">No products found. Try adjusting your filters.</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  PRODUCT DETAIL                                        */
/* ═══════════════════════════════════════════════════════ */
function ProductDetail({ product, onBack, addToCart, inCart }: { product: Product; onBack: ()=>void; addToCart: (p: Product)=>void; inCart: boolean }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <button onClick={onBack} className="text-gray-400 hover:text-white mb-8 flex items-center gap-2">← Back to catalog</button>
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{catIcons[product.category] || '🤖'}</span>
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <div className="flex gap-3 mt-2">
                <span className="text-sm text-gray-400">{product.category}</span>
                {product.tier && <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${tierColors[product.tier] || ''}`}>{product.tier}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-cyan-400">{formatPrice(product.base_price)}</div>
            {product.engagement_model && <div className="text-sm text-gray-500 mt-1">{product.engagement_model}</div>}
          </div>
        </div>
        <p className="text-gray-300 text-lg leading-relaxed mb-8">{product.description}</p>
        {product.customer_outcome && (
          <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-6 mb-8">
            <h3 className="font-semibold text-cyan-400 mb-2">Expected Outcome</h3>
            <p className="text-gray-300">{product.customer_outcome}</p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {product.target_audience && <div><span className="text-sm text-gray-500 block mb-1">Target Audience</span><span className="text-gray-300">{product.target_audience}</span></div>}
          {product.delivery_method && <div><span className="text-sm text-gray-500 block mb-1">Delivery</span><span className="text-gray-300">{product.delivery_method}</span></div>}
        </div>
        <button onClick={() => addToCart(product)}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition ${inCart ? 'bg-green-500/20 text-green-400' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/25'}`}>
          {inCart ? '✓ In Contract' : '+ Add to Contract'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  CART VIEW                                             */
/* ═══════════════════════════════════════════════════════ */
function CartView({ cart, removeFromCart, cartTotal, onCheckout }: any) {
  if (cart.length === 0) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <Icons.Cart />
      <h2 className="text-2xl font-bold mt-4 mb-2">Your contract is empty</h2>
      <p className="text-gray-400">Browse the catalog and add AI agents to build your contract.</p>
    </div>
  );
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-8">Contract Builder</h2>
      <div className="space-y-4 mb-8">
        {(cart as CartItem[]).map(c => (
          <div key={c.product.id} className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{catIcons[c.product.category] || '🤖'}</span>
              <div>
                <h3 className="font-semibold">{c.product.name}</h3>
                <span className="text-sm text-gray-500">{c.product.category} {c.product.tier && `· ${c.product.tier}`}</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-cyan-400 font-bold">{formatPrice(c.product.base_price)}</span>
              <button onClick={() => removeFromCart(c.product.id)} className="text-gray-500 hover:text-red-400 transition"><Icons.X /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 flex items-center justify-between">
        <div><span className="text-gray-400">Contract Total</span><div className="text-3xl font-bold text-cyan-400">{formatPrice(cartTotal)}</div></div>
        <button onClick={onCheckout} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all">
          Configure & Submit <Icons.Arrow />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  CONFIGURE / CHECKOUT VIEW                             */
/* ═══════════════════════════════════════════════════════ */
function ConfigureView({ cart, cartTotal, wizardStep, setWizardStep, contractData, setContractData, submitting, submitOrder, onBrowse }: any) {
  if (cart.length === 0) return (
    <div className="max-w-3xl mx-auto px-6 py-20 text-center">
      <h2 className="text-2xl font-bold mb-4">No items in contract</h2>
      <p className="text-gray-400 mb-6">Add products from the catalog first.</p>
      <button onClick={onBrowse} className="px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition font-medium">Browse Catalog</button>
    </div>
  );

  const steps = ['Details', 'SLA', 'Review'];
  const canSubmit = contractData.email && contractData.company;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-bold mb-8">Configure Contract</h2>
      {/* Step indicator */}
      <div className="flex items-center gap-4 mb-12">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <button onClick={() => setWizardStep(i)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${i === wizardStep ? 'bg-cyan-500 text-white' : i < wizardStep ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-500'}`}>
              {i < wizardStep ? <Icons.Check /> : <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs">{i+1}</span>}
              {s}
            </button>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-white/10" />}
          </React.Fragment>
        ))}
      </div>

      {wizardStep === 0 && (
        <div className="space-y-6">
          <div><label className="text-sm text-gray-400 mb-2 block">Company Name *</label><input value={contractData.company} onChange={e => setContractData({...contractData, company: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /></div>
          <div><label className="text-sm text-gray-400 mb-2 block">Your Name</label><input value={contractData.name} onChange={e => setContractData({...contractData, name: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /></div>
          <div><label className="text-sm text-gray-400 mb-2 block">Email *</label><input type="email" value={contractData.email} onChange={e => setContractData({...contractData, email: e.target.value})} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-500/50" /></div>
          <button onClick={() => setWizardStep(1)} disabled={!contractData.email || !contractData.company} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium disabled:opacity-30 hover:bg-cyan-600 transition">Next: SLA <Icons.Arrow /></button>
        </div>
      )}

      {wizardStep === 1 && (
        <div className="space-y-4">
          {[
            { id: 'standard', name: 'Standard', desc: 'Business hours support, 24h response SLA', price: 'Included' },
            { id: 'premium', name: 'Premium', desc: '12/7 support, 4h response SLA, dedicated buddy', price: '+15%' },
            { id: 'enterprise', name: 'Enterprise', desc: '24/7 support, 1h response SLA, priority deployment', price: '+25%' },
          ].map(s => (
            <button key={s.id} onClick={() => setContractData({...contractData, sla: s.id})}
              className={`w-full text-left p-6 rounded-xl border transition ${contractData.sla === s.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
              <div className="flex justify-between items-start">
                <div><h3 className="font-semibold text-lg">{s.name}</h3><p className="text-sm text-gray-400 mt-1">{s.desc}</p></div>
                <span className="text-cyan-400 font-medium">{s.price}</span>
              </div>
            </button>
          ))}
          <div className="flex gap-4 mt-6">
            <button onClick={() => setWizardStep(0)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={() => setWizardStep(2)} className="px-8 py-3 bg-cyan-500 rounded-xl font-medium hover:bg-cyan-600 transition">Review Contract <Icons.Arrow /></button>
          </div>
        </div>
      )}

      {wizardStep === 2 && (
        <div>
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-6">
            <h3 className="font-semibold mb-4">Contract Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Company</span><span>{contractData.company}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Email</span><span>{contractData.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">SLA</span><span className="capitalize">{contractData.sla}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Items</span><span>{cart.length} product{cart.length > 1 ? 's' : ''}</span></div>
              <hr className="border-white/5 my-3" />
              {(cart as CartItem[]).map((c: CartItem) => (
                <div key={c.product.id} className="flex justify-between"><span className="text-gray-400">{c.product.name}</span><span>{formatPrice(c.product.base_price)}</span></div>
              ))}
              <hr className="border-white/5 my-3" />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-cyan-400">{formatPrice(cartTotal)}</span></div>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setWizardStep(1)} className="px-6 py-3 border border-white/10 rounded-xl hover:bg-white/5 transition">Back</button>
            <button onClick={submitOrder} disabled={submitting || !canSubmit}
              className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-lg hover:shadow-cyan-500/25 transition-all disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit Contract'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  DASHBOARD VIEW                                        */
/* ═══════════════════════════════════════════════════════ */
function DashboardView({ orderResult, cart, contractData, cartTotal }: any) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <Icons.Check />
        </div>
        <h1 className="text-3xl font-bold mb-3">Contract Submitted!</h1>
        <p className="text-gray-400 text-lg">Your AI agents are being compiled and will move through our 9-state pipeline.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center">
          <span className="text-sm text-gray-500">Order</span>
          <div className="text-lg font-mono text-cyan-400 mt-1">{orderResult?.order_id?.slice(0,8) || '—'}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center">
          <span className="text-sm text-gray-500">Contract</span>
          <div className="text-lg font-mono text-cyan-400 mt-1">{orderResult?.contract_id?.slice(0,8) || '—'}</div>
        </div>
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 text-center">
          <span className="text-sm text-gray-500">Status</span>
          <div className="text-lg font-mono text-yellow-400 mt-1">requested</div>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-4">What Happens Next</h3>
        <div className="space-y-4">
          {[
            { state: 'interpreted', desc: 'Our system interprets your requirements and maps to agent capabilities' },
            { state: 'compiled', desc: 'Agent contract is compiled with SLA bindings and deployment specs' },
            { state: 'validated', desc: 'Automated validation checks compatibility and risk scores' },
            { state: 'approved', desc: 'Contract is approved and enters deployment queue' },
            { state: 'staged', desc: 'Agents are provisioned in your sandbox environment' },
            { state: 'live', desc: 'Agents go live — your Buddy will confirm and provide support' },
          ].map((s, i) => (
            <div key={s.state} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs text-gray-500 font-mono shrink-0">{i+1}</div>
              <div><span className="font-mono text-cyan-400 text-sm">{s.state}</span><p className="text-sm text-gray-400 mt-0.5">{s.desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-6 text-center">
        <Icons.Headphones />
        <h3 className="font-semibold mt-3 mb-2">Need Help?</h3>
        <p className="text-sm text-gray-400 mb-4">Your assigned Buddy will reach out within 24 hours. Or visit the Buddy portal now.</p>
        <a href="/buddy" className="inline-block px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition font-medium">Go to Buddy Portal</a>
      </div>
    </div>
  );
}
