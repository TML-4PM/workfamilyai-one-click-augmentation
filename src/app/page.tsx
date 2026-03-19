'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Product {
  product_id: string; product_name: string; family: string; risk_tier: number;
  autonomy_start_level: string; billing_model: string; description: string;
  starter_price_usd: number; monthly_price_usd: number; requires_human_gate: boolean;
  exec_steps: number; test_modules: number; template_intensity: string;
}
interface OrderResult {
  order_id: string;
  contract: { contract_id: string; readiness_score: number; readiness_level: string; state: string };
  product: Product; readiness_score: number; dependency_packs: string[]; message: string;
}

const FAMILY_ICONS: Record<string,string> = {
  sales:'💼', marketing:'📣', service:'🎧', operations:'⚙️', content:'🎬',
  intelligence:'🔍', platform:'🔧', finance:'💰', hr:'👥', grants:'🏛️',
};
const RISK_LABELS: Record<number,{label:string;color:string}> = {
  0:{label:'Info',color:'text-green-400 bg-green-900/40'},
  1:{label:'Comms',color:'text-blue-400 bg-blue-900/40'},
  2:{label:'Commercial',color:'text-yellow-400 bg-yellow-900/40'},
  3:{label:'Financial',color:'text-orange-400 bg-orange-900/40'},
  4:{label:'System',color:'text-red-400 bg-red-900/40'},
};
const FAMILIES = ['all','sales','marketing','service','operations','content','intelligence','platform','finance','hr','grants'];
const STEPS = ['Choose','Details','Preview','Pay'];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s,i) => (
        <React.Fragment key={s}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
            ${i===current?'bg-blue-600 text-white':i<current?'bg-green-700 text-green-200':'bg-slate-800 text-slate-500'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
              ${i<current?'bg-green-500 text-white':i===current?'bg-white text-blue-600':'bg-slate-700 text-slate-400'}`}>
              {i<current?'✓':i+1}
            </span>{s}
          </div>
          {i<STEPS.length-1 && <div className={`h-0.5 w-6 ${i<current?'bg-green-600':'bg-slate-700'}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function ProductCard({ p, selected, onClick }: { p: Product; selected: boolean; onClick: ()=>void }) {
  const risk = RISK_LABELS[p.risk_tier] || RISK_LABELS[0];
  return (
    <button onClick={onClick} className={`text-left w-full p-4 rounded-xl border transition-all
      ${selected?'border-blue-500 bg-blue-950/60 ring-1 ring-blue-500':'border-slate-700 bg-slate-800/60 hover:border-slate-500'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{FAMILY_ICONS[p.family]||'🤖'}</span>
          <span className="font-semibold text-white text-sm leading-tight">{p.product_name}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${risk.color}`}>{risk.label}</span>
      </div>
      <p className="text-slate-400 text-xs leading-relaxed mb-3 line-clamp-2">{p.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-slate-500 text-xs capitalize">{p.family}</span>
        <div className="text-right">
          <div className="text-white font-bold text-sm">${p.monthly_price_usd}<span className="text-slate-500 font-normal">/mo</span></div>
          {p.starter_price_usd > 0 && <div className="text-slate-500 text-xs">+${p.starter_price_usd} setup</div>}
        </div>
      </div>
      {selected && (
        <div className="mt-3 pt-3 border-t border-blue-800/50 flex gap-3 text-xs text-slate-400">
          <span>⚡ {p.exec_steps ?? '—'} steps</span>
          <span>🧪 {p.test_modules ?? '—'} tests</span>
          <span>🤖 L{p.autonomy_start_level?.replace('L','')}</span>
          {p.requires_human_gate && <span className="text-yellow-500">🔒 gated</span>}
        </div>
      )}
    </button>
  );
}

function ReadinessBadge({ score, level }: { score: number; level: string }) {
  const color = score>=80?'text-green-400':score>=60?'text-yellow-400':'text-red-400';
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800 border border-slate-700">
      <div className={`text-3xl font-black ${color}`}>{score}%</div>
      <div>
        <div className="text-white text-sm font-medium">Agent Readiness</div>
        <div className="text-slate-400 text-xs capitalize">{level?.replace('_',' ')}</div>
      </div>
      <div className="ml-auto">
        <div className="h-2 w-24 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${score>=80?'bg-green-500':score>=60?'bg-yellow-500':'bg-red-500'}`}
               style={{width:`${score}%`}} />
        </div>
      </div>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const paid = searchParams.get('paid');
  const cancelled = searchParams.get('cancelled');
  const returnOrderId = searchParams.get('order_id');

  const [step, setStep] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product|null>(null);
  const [customer, setCustomer] = useState({ name:'', email:'', company:'', country:'AU', tech_comfort_level:'basic' });
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult|null>(null);
  const [customerId, setCustomerId] = useState<string|null>(null);
  const [error, setError] = useState('');
  const [postPaid, setPostPaid] = useState<{deployed:boolean;instance_id:string;state:string}|null>(null);

  useEffect(() => {
    fetch('/api/products').then(r=>r.json()).then(d=>setProducts(d.products||[]));
  }, []);

  // Handle return from Stripe
  useEffect(() => {
    if (paid && returnOrderId) {
      setStep(3);
      // Trigger deploy
      fetch('/api/deploy', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ order_id: returnOrderId, trigger: 'post_payment' }),
      }).then(r=>r.json()).then(d=>setPostPaid(d)).catch(()=>{});
    }
    if (cancelled) {
      setError('Payment cancelled. Your contract is saved — try again when ready.');
    }
  }, [paid, cancelled, returnOrderId]);

  const filtered = products.filter(p => {
    const matchFamily = filter==='all'||p.family===filter;
    const matchSearch = !search||p.product_name.toLowerCase().includes(search.toLowerCase())
      ||p.description?.toLowerCase().includes(search.toLowerCase())
      ||p.family.toLowerCase().includes(search.toLowerCase());
    return matchFamily && matchSearch;
  });

  async function handleOrder() {
    setLoading(true); setError('');
    try {
      const custRes = await fetch('/api/customer', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(customer),
      });
      const custData = await custRes.json();
      if (custData.error) throw new Error(custData.error);
      const cid = custData.customer?.customer_id;
      setCustomerId(cid);

      const orderRes = await fetch('/api/order', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ customer_id: cid, product_id: selected!.product_id, request_mode: 'catalogue' }),
      });
      const orderData = await orderRes.json();
      if (orderData.error) throw new Error(orderData.error);
      setOrderResult(orderData);
      setStep(2);
    } catch(e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout() {
    if (!orderResult || !customerId || !selected) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/checkout', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          order_id: orderResult.order_id,
          customer_id: customerId,
          product_id: selected.product_id,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch(e) {
      setError(String(e));
      setLoading(false);
    }
  }

  // Post-payment success screen
  if (paid && step === 3) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div><div className="font-bold text-white">WorkFamilyAI</div><div className="text-xs text-slate-400">One-Click Augmentation</div></div>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment confirmed</h2>
            <p className="text-slate-400 text-sm mb-6">Your agent is being provisioned in staging_safe.</p>
            {postPaid ? (
              <div className="bg-slate-800/60 rounded-xl border border-green-700/40 p-5 text-left mb-6">
                <div className="text-green-400 font-semibold text-sm mb-3">✅ Agent instance live</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><div className="text-slate-500 mb-1">Instance ID</div><div className="text-white font-mono">{postPaid.instance_id?.slice(0,16)}…</div></div>
                  <div><div className="text-slate-500 mb-1">State</div><div className="text-green-400 capitalize font-semibold">{postPaid.state}</div></div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 mb-6 text-slate-400 text-sm">
                ⏳ Provisioning instance…
              </div>
            )}
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 mb-6 text-yellow-300 text-xs">
              ⚠️ Running in <strong>staging_safe</strong> — no live sends, no real charges until promoted.
            </div>
            <button onClick={()=>{ window.location.href='/'; }}
              className="w-full py-2.5 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">
              Deploy another agent →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🤖</span>
            <div><div className="font-bold text-white">WorkFamilyAI</div><div className="text-xs text-slate-400">One-Click Augmentation</div></div>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">50 agents · staging-safe · all gated</div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <StepBar current={step} />

        {cancelled && (
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-6 text-yellow-300 text-sm text-center">
            Payment cancelled. Contract is saved — continue when ready.
          </div>
        )}

        {/* STEP 0 — Choose */}
        {step===0 && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-white mb-2">Deploy your first augmentation.</h1>
              <p className="text-slate-400">Pick a product. We handle the rest — contract, compliance, and deployment.</p>
            </div>
            <div className="flex gap-3 mb-4 flex-wrap">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products…"
                className="flex-1 min-w-48 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500" />
              <div className="flex gap-1 flex-wrap">
                {FAMILIES.map(f=>(
                  <button key={f} onClick={()=>setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                      ${filter===f?'bg-blue-600 text-white':'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                    {f==='all'?`All (${products.length})`:`${FAMILY_ICONS[f]||''} ${f}`}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {filtered.map(p=>(
                <ProductCard key={p.product_id} p={p}
                  selected={selected?.product_id===p.product_id}
                  onClick={()=>setSelected(selected?.product_id===p.product_id?null:p)} />
              ))}
            </div>
            {selected && (
              <div className="sticky bottom-4">
                <div className="bg-blue-600 rounded-xl p-4 flex items-center justify-between shadow-2xl">
                  <div>
                    <div className="font-bold text-white">{selected.product_name}</div>
                    <div className="text-blue-200 text-sm">${selected.monthly_price_usd}/mo{selected.starter_price_usd>0?` · $${selected.starter_price_usd} setup`:''} · {selected.exec_steps??'—'} steps</div>
                  </div>
                  <button onClick={()=>setStep(1)}
                    className="bg-white text-blue-700 font-bold px-5 py-2 rounded-lg hover:bg-blue-50 transition-all text-sm">
                    Continue →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1 — Details */}
        {step===1 && selected && (
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{FAMILY_ICONS[selected.family]||'🤖'}</div>
              <h2 className="text-2xl font-bold text-white">{selected.product_name}</h2>
              <p className="text-slate-400 text-sm mt-1">{selected.description}</p>
            </div>
            <div className="space-y-3 bg-slate-800/60 rounded-xl p-5 border border-slate-700">
              <h3 className="text-white font-semibold text-sm">Your details</h3>
              {([['name','Full name','text',true],['email','Work email','email',true],['company','Company name','text',false],['country','Country code (AU, US, SG…)','text',false]] as const).map(([field,label,type,required])=>(
                <div key={field}>
                  <label className="text-slate-400 text-xs block mb-1">{label}{required&&' *'}</label>
                  <input type={type} value={(customer as Record<string,string>)[field]}
                    onChange={e=>setCustomer(c=>({...c,[field]:e.target.value}))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              ))}
              <div>
                <label className="text-slate-400 text-xs block mb-1">Tech comfort level</label>
                <select value={customer.tech_comfort_level}
                  onChange={e=>setCustomer(c=>({...c,tech_comfort_level:e.target.value}))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="very_low">Just getting started</option>
                  <option value="basic">Comfortable with email/apps</option>
                  <option value="comfortable">Use tools like HubSpot or Zapier</option>
                  <option value="advanced">Technical team in-house</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setStep(0)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">← Back</button>
              <button onClick={()=>setStep(2)} disabled={!customer.name||!customer.email}
                className="flex-2 px-8 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed">
                Preview contract →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Contract preview + pay */}
        {step===2 && selected && (
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Contract Preview</h2>
            <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden mb-4">
              {([
                ['Agent', selected.product_name],
                ['Family', selected.family],
                ['Objective', selected.description],
                ['Channels', 'LinkedIn · Email'],
                ['Autonomy start', selected.autonomy_start_level],
                ['Risk tier', `Tier ${selected.risk_tier} — ${RISK_LABELS[selected.risk_tier]?.label}`],
                ['Human gate', selected.requires_human_gate?'🔒 Required':'✅ Not required'],
                ['Environment', 'staging_safe'],
                ['Guardrails', 'Margin floor 55% · Max discount 10%'],
                ['Exec steps', `${selected.exec_steps??'—'} autonomous steps`],
                ['Test modules', `${selected.test_modules??'—'} validation tests`],
                ['Monthly', `$${selected.monthly_price_usd}/mo`],
                ['Setup', selected.starter_price_usd>0?`$${selected.starter_price_usd} once`:'None'],
              ] as [string,string][]).map(([k,v])=>(
                <div key={k} className="flex gap-3 px-4 py-2.5 border-b border-slate-700/50 last:border-0">
                  <span className="text-slate-500 text-xs w-32 shrink-0 pt-0.5">{k}</span>
                  <span className="text-white text-xs flex-1">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3 mb-4 text-yellow-300 text-xs">
              ⚠️ Deploys to <strong>staging_safe</strong>. No live sends until promoted.
            </div>
            {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-300 text-xs">{error}</div>}

            {!orderResult ? (
              <div className="flex gap-3">
                <button onClick={()=>setStep(1)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">← Back</button>
                <button onClick={handleOrder} disabled={loading}
                  className="flex-2 px-8 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-60">
                  {loading?'⏳ Compiling…':'📋 Compile contract →'}
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4"><ReadinessBadge score={orderResult.readiness_score} level={orderResult.contract?.readiness_level} /></div>
                <div className="bg-blue-900/30 border border-blue-700/40 rounded-lg p-3 mb-4 text-blue-200 text-xs">
                  ✅ Contract compiled — Order <span className="font-mono">{orderResult.order_id?.slice(0,12)}…</span>
                </div>
                <div className="flex gap-3">
                  <button onClick={()=>setStep(1)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">← Back</button>
                  <button onClick={handleCheckout} disabled={loading}
                    className="flex-2 px-8 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-500 disabled:opacity-60">
                    {loading?'⏳ Redirecting…':'💳 Pay & Deploy →'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 text-center py-4 text-slate-600 text-xs mt-8">
        WorkFamilyAI · One-Click Augmentation · staging-safe · all actions gated
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}
