'use client';
import React, { useState, useMemo } from 'react';

interface Product {
  id: number; sku: string; name: string; desc: string; story: string;
  cat: string; emoji: string; agents: number; price1: number;
  priceMo: number; tokens: string;
}

const PRODUCTS: Product[] = [
  {id:1,sku:"AGENT-001",name:"Client Onboarding System",desc:"Automates new client onboarding via form-triggered workflow: creates Drive folders, ClickUp tasks, Slack",story:"A new client fills a form on your website. The system instantly creates their Google Drive folder structure, pulls tasks from the proposal PDF, sets up ClickUp, and sends a personalised Slack welcome message.",cat:"Operations",emoji:"⚙️",agents:14,price1:49,priceMo:19,tokens:"500k tokens/month"},
  {id:2,sku:"AGENT-002",name:"FB Ad Spy Tool",desc:"Fully automated Facebook Ads Scraper and Analyzer: scrapes Ad Library, categorizes, GPT rewrite, Gemini",story:"A marketer pastes a competitor name. The system scrapes their entire ad library, categorises every ad, rewrites copy, analyses videos, and delivers a ready-to-use report.",cat:"Marketing",emoji:"📣",agents:12,price1:79,priceMo:29,tokens:"1M tokens/month"},
  {id:3,sku:"AGENT-003",name:"AI Video Analysis",desc:"Free AI video analysis with Google Gemini: local files/YouTube, polling, summarization, insights",story:"User uploads a YouTube link or video file. The system analyses content for key moments, sentiment, key takeaways, and generates a structured summary report with timestamps.",cat:"Content",emoji:"🎬",agents:8,price1:29,priceMo:9,tokens:"300k tokens/month"},
  {id:4,sku:"AGENT-004",name:"Viral AI Videos",desc:"Automates viral AI video generation with Veo 3: scripts, FAL V3, looping status-check, Google Sheets",story:"Content creator enters a topic and target length. The system generates cinematic script, creates video with Veo 3, adds voiceover, and uploads to YouTube with SEO title.",cat:"Content",emoji:"🎬",agents:11,price1:59,priceMo:24,tokens:"800k tokens/month"},
  {id:5,sku:"AGENT-005",name:"ChatGPT Image Workflow",desc:"Integrates OpenAI image model: creates/merges images, Base64, prompt customization",story:"User describes an image concept. The system generates the image using the latest OpenAI model, merges it with existing assets if needed, and saves branded versions to Drive.",cat:"Content",emoji:"🎬",agents:7,price1:39,priceMo:14,tokens:"400k tokens/month"},
  {id:6,sku:"AGENT-006",name:"Real-Time Insights System",desc:"Extracts real-time insights from X: Bolt frontend, Supabase edge, Grok Live Search, Pulse agent",story:"User asks a question about current trends. The system pulls real-time data from X, analyses it, and delivers instant insights with sources.",cat:"Intelligence",emoji:"🧠",agents:9,price1:49,priceMo:19,tokens:"600k tokens/month"},
  {id:7,sku:"AGENT-007",name:"Viral Baby Videos",desc:"Automates viral baby videos: Sheets DB, OpenAI text/image, 11 Labs audio, Drive/YouTube",story:"Parent or creator inputs baby name and theme. The system generates cute video ideas, creates video with AI tools, and posts to YouTube and Instagram.",cat:"Content",emoji:"🎬",agents:10,price1:69,priceMo:29,tokens:"700k tokens/month"},
  {id:8,sku:"AGENT-008",name:"Faceless Video Maker",desc:"Automates faceless YouTube videos: Sheets webhook, Anthropic script, OpenAI images, Runway, 11 Labs",story:"Creator enters topic. The system generates script, creates images, merges into faceless video, adds captions and voiceover, and schedules upload.",cat:"Content",emoji:"🎬",agents:13,price1:89,priceMo:39,tokens:"900k tokens/month"},
  {id:9,sku:"AGENT-009",name:"AI Clone Avatar System",desc:"Automates AI clone video: HeyGen API, auth, avatar/voice IDs, polling loops",story:"User records a short video of themselves. The system creates a digital clone and generates new videos from text scripts.",cat:"Content",emoji:"🎬",agents:8,price1:59,priceMo:24,tokens:"500k tokens/month"},
  {id:10,sku:"AGENT-010",name:"Meeting No-show Eliminator",desc:"Automates no-show prevention: trigger, scraping, Tavily AI, Airtable, Twilio SMS, Gmail",story:"Salesperson books a meeting. The system sends reminders, scrapes LinkedIn for context, and follows up automatically if no-show.",cat:"Sales",emoji:"🎯",agents:11,price1:49,priceMo:19,tokens:"400k tokens/month"},
  {id:11,sku:"AGENT-011",name:"Viral Shorts Machine",desc:"24/7 viral shorts from Google Sheet: FAL Flux, Cling video, ElevenLabs, Creatomate, Blotato posting",story:"Creator enters a trending topic. The system generates 10 Shorts variations, adds voiceover and captions, and posts to TikTok, Instagram, and YouTube.",cat:"Content",emoji:"🎬",agents:12,price1:79,priceMo:29,tokens:"800k tokens/month"},
  {id:12,sku:"AGENT-012",name:"Voice AI Receptionist",desc:"AI voice receptionist: answers calls, qualifies leads, books appointments, escalates",story:"A customer calls your business number. The AI receptionist answers, qualifies the caller, books an appointment if needed, and escalates urgent issues.",cat:"Service",emoji:"🎧",agents:8,price1:69,priceMo:29,tokens:"500k tokens/month"},
  {id:13,sku:"AGENT-013",name:"AI Copywriter Team",desc:"Full AI copywriting team: research, drafting, brand voice, multi-channel publishing",story:"User gives a content brief. The AI team researches the topic, writes in your brand voice, and publishes across all channels simultaneously.",cat:"Marketing",emoji:"📣",agents:9,price1:59,priceMo:24,tokens:"600k tokens/month"},
  {id:14,sku:"AGENT-014",name:"Scraping Automation",desc:"Automates web scraping pipelines: multi-site, structured extraction, Supabase storage",story:"User provides target URLs. The system scrapes structured data on a schedule, deduplicates, and loads clean records into your database.",cat:"Operations",emoji:"⚙️",agents:6,price1:39,priceMo:15,tokens:"300k tokens/month"},
  {id:15,sku:"AGENT-015",name:"Viral LinkedIn Posts",desc:"AI LinkedIn content system: hook writing, formatting, scheduling, engagement tracking",story:"User inputs their expertise area. The system generates high-performing LinkedIn posts, optimises timing, and tracks engagement metrics.",cat:"Marketing",emoji:"📣",agents:7,price1:49,priceMo:19,tokens:"400k tokens/month"},
  {id:16,sku:"AGENT-016",name:"Agent Tracking System",desc:"Tracks all agent activity: logs, performance metrics, anomaly detection, dashboards",story:"Admin wants visibility across all deployed agents. The system monitors activity, flags anomalies, and surfaces performance dashboards.",cat:"Intelligence",emoji:"🧠",agents:6,price1:59,priceMo:24,tokens:"400k tokens/month"},
  {id:17,sku:"AGENT-017",name:"Carousel & Slides Automation",desc:"Auto-generates branded carousels and slides from any content input",story:"User pastes a blog post or bullet points. The system converts it into branded carousel slides ready for LinkedIn or Instagram.",cat:"Marketing",emoji:"📣",agents:7,price1:39,priceMo:15,tokens:"300k tokens/month"},
  {id:18,sku:"AGENT-018",name:"Proposal Generator",desc:"AI proposal generator: discovery to formatted proposal in minutes",story:"Sales rep logs key meeting notes. The system generates a fully formatted proposal with pricing, scope, and timeline in minutes.",cat:"Sales",emoji:"🎯",agents:8,price1:59,priceMo:24,tokens:"400k tokens/month"},
  {id:19,sku:"AGENT-019",name:"Google Map Scraper",desc:"Scrapes Google Maps for business leads: name, phone, email, reviews, hours",story:"User enters a business category and location. The system extracts every matching business with contact details into a clean spreadsheet.",cat:"Marketing",emoji:"📣",agents:5,price1:29,priceMo:9,tokens:"200k tokens/month"},
  {id:20,sku:"AGENT-020",name:"Dynamic AI Agent Workflow",desc:"Builds and runs custom multi-agent workflows from a simple config",story:"User describes a workflow in plain English. The system builds and executes a multi-agent pipeline with no code required.",cat:"Platform",emoji:"🔌",agents:10,price1:69,priceMo:29,tokens:"700k tokens/month"},
  {id:21,sku:"AGENT-021",name:"LeadGen Outreach",desc:"Full lead generation and outreach: scrape, enrich, personalise, send, track",story:"User defines their ICP. The system finds matching leads, enriches with data, writes personalised outreach, sends, and tracks replies.",cat:"Sales",emoji:"🎯",agents:11,price1:79,priceMo:29,tokens:"800k tokens/month"},
  {id:22,sku:"AGENT-022",name:"Product Videography",desc:"AI product video creator: shoot brief to edited video with voiceover",story:"User uploads product photos and a brief. The system creates a polished product video with motion, music, and voiceover.",cat:"Content",emoji:"🎬",agents:8,price1:69,priceMo:29,tokens:"600k tokens/month"},
  {id:23,sku:"AGENT-023",name:"Cold Email Automation",desc:"End-to-end cold email system: list building, personalisation, sending, follow-ups",story:"User defines their target market. The system builds a list, writes personalised emails, sends sequences, and auto-follows up.",cat:"Sales",emoji:"🎯",agents:9,price1:59,priceMo:24,tokens:"500k tokens/month"},
  {id:24,sku:"AGENT-024",name:"Lovable Web App Builder",desc:"AI builds full web apps from a plain English brief",story:"User describes the app they want. The system generates, builds, and deploys a working web app with Supabase backend.",cat:"Platform",emoji:"🔌",agents:10,price1:99,priceMo:39,tokens:"1M tokens/month"},
  {id:25,sku:"AGENT-025",name:"Marketing AI Team",desc:"Full AI marketing department: strategy, content, ads, analytics, reporting",story:"Business owner activates the marketing team. It handles strategy, creates content, runs ads, analyses performance, and reports weekly.",cat:"Marketing",emoji:"📣",agents:14,price1:99,priceMo:39,tokens:"1.5M tokens/month"},
  {id:26,sku:"AGENT-026",name:"Faceless Video AI",desc:"Advanced faceless video pipeline with scene-by-scene AI generation",story:"Creator picks a niche. The system handles scripting, AI scene generation, audio, captioning, and upload on autopilot.",cat:"Content",emoji:"🎬",agents:11,price1:79,priceMo:29,tokens:"900k tokens/month"},
  {id:27,sku:"AGENT-027",name:"Image Creation and Editing System",desc:"AI image pipeline: generate, edit, brand, store, deliver at scale",story:"User provides a creative brief. The system generates images, applies brand guidelines, resizes for each platform, and delivers.",cat:"Content",emoji:"🎬",agents:7,price1:49,priceMo:19,tokens:"500k tokens/month"},
  {id:28,sku:"AGENT-028",name:"Viral Shorts Automation",desc:"Fully automated viral shorts engine: trending topics to posted content daily",story:"User sets niche and style. The system monitors trends, scripts shorts, generates video, and posts daily across all platforms.",cat:"Content",emoji:"🎬",agents:10,price1:69,priceMo:29,tokens:"700k tokens/month"},
  {id:29,sku:"AGENT-029",name:"ChatGPT Automation System",desc:"ChatGPT-powered automation for any repetitive text task",story:"User describes a repetitive task. The system wraps it in a ChatGPT automation that runs on schedule or trigger.",cat:"Platform",emoji:"🔌",agents:6,price1:39,priceMo:15,tokens:"300k tokens/month"},
  {id:30,sku:"AGENT-030",name:"AI Image Automation",desc:"Bulk AI image generation pipeline: prompts to branded assets at scale",story:"User provides a prompt list or data source. The system generates hundreds of branded images and organises them by category.",cat:"Content",emoji:"🎬",agents:6,price1:39,priceMo:15,tokens:"400k tokens/month"},
  {id:31,sku:"AGENT-031",name:"Customer Support Automation",desc:"AI customer support: triage, respond, escalate, log — 24/7",story:"Customer sends a support request. The AI triages it, responds instantly, escalates if needed, and logs everything.",cat:"Service",emoji:"🎧",agents:8,price1:59,priceMo:24,tokens:"500k tokens/month"},
  {id:32,sku:"AGENT-032",name:"LinkedIn Visual Automation",desc:"AI creates and posts branded LinkedIn visual content on autopilot",story:"User sets posting frequency and topics. The system creates branded visuals and posts to LinkedIn without manual effort.",cat:"Marketing",emoji:"📣",agents:7,price1:49,priceMo:19,tokens:"400k tokens/month"},
  {id:33,sku:"AGENT-033",name:"Job Search Automation",desc:"AI job search agent: scrape listings, match profile, apply, track",story:"Job seeker inputs their CV and criteria. The system finds matching jobs, tailors applications, and tracks all submissions.",cat:"HR",emoji:"👥",agents:7,price1:39,priceMo:15,tokens:"300k tokens/month"},
  {id:34,sku:"AGENT-034",name:"Inbox Automation",desc:"AI inbox manager: triage, respond, delegate, archive — zero inbox",story:"User connects their email. The AI reads, triages, drafts responses, and flags only what needs human attention.",cat:"Operations",emoji:"⚙️",agents:7,price1:39,priceMo:15,tokens:"300k tokens/month"},
  {id:35,sku:"AGENT-035",name:"Error Logger Workflow",desc:"AI error detection and logging pipeline with alerting and root cause analysis",story:"Developer deploys the logger. It monitors logs in real-time, detects errors, groups related issues, and alerts with root cause context.",cat:"Operations",emoji:"⚙️",agents:6,price1:39,priceMo:15,tokens:"200k tokens/month"},
  {id:36,sku:"AGENT-036",name:"Think Tool Agent",desc:"Structured reasoning agent: break down complex problems step-by-step with tool use",story:"User gives a complex task. The agent thinks through it step-by-step, uses tools to validate, and produces a verified answer.",cat:"Platform",emoji:"🔌",agents:7,price1:49,priceMo:19,tokens:"500k tokens/month"},
  {id:37,sku:"AGENT-037",name:"Meta Ad Automation",desc:"Full Meta ads automation: create, launch, optimise, report",story:"Marketer inputs offer and audience. The system creates ad variants, launches campaigns, optimises daily, and reports weekly.",cat:"Marketing",emoji:"📣",agents:9,price1:69,priceMo:29,tokens:"600k tokens/month"},
  {id:38,sku:"AGENT-038",name:"Automated Hiring Workflow",desc:"AI hiring pipeline: job post to offer letter, automated",story:"HR posts a role. The system writes the JD, screens applicants, schedules interviews, and drafts offer letters.",cat:"HR",emoji:"👥",agents:10,price1:69,priceMo:29,tokens:"600k tokens/month"},
  {id:39,sku:"AGENT-039",name:"Email & Complaint Automation",desc:"Auto-handle inbound emails and complaints: triage, respond, escalate, log",story:"Customer sends email or complaint. The system triages, responds, escalates if needed, and logs everything.",cat:"Service",emoji:"🎧",agents:9,price1:49,priceMo:19,tokens:"400k tokens/month"},
  {id:40,sku:"AGENT-040",name:"MCP Integration",desc:"Connect any tool to any agent via Model Context Protocol adapters",story:"User wants to connect a new tool. The system registers it as an MCP adapter and makes it available to all agents.",cat:"Platform",emoji:"🔌",agents:8,price1:59,priceMo:24,tokens:"500k tokens/month"},
  {id:41,sku:"AGENT-041",name:"AI Think Agent System",desc:"Multi-step reasoning chain with tool use, memory, and action execution",story:"User gives a complex task. The system breaks it down step-by-step, uses tools, and validates the final answer.",cat:"Platform",emoji:"🔌",agents:9,price1:59,priceMo:24,tokens:"600k tokens/month"},
  {id:42,sku:"AGENT-042",name:"WhatsApp AI Agent",desc:"AI agent on WhatsApp: responds, qualifies leads, books, escalates",story:"Customer messages on WhatsApp. The system responds, qualifies leads, books appointments, and escalates when needed.",cat:"Service",emoji:"🎧",agents:8,price1:59,priceMo:24,tokens:"500k tokens/month"},
  {id:43,sku:"AGENT-043",name:"Claude MCP Content Automation",desc:"Claude-powered content pipeline using MCP tools for research, write, publish",story:"User enters content brief. The system uses Claude with MCP tools to research, write, and publish across platforms.",cat:"Platform",emoji:"🔌",agents:9,price1:49,priceMo:19,tokens:"400k tokens/month"},
  {id:44,sku:"AGENT-044",name:"Social Media Scraper",desc:"Scrapes social platforms for trending content, competitor posts, hashtags",story:"User enters competitor handles. The system scrapes posts, transcripts, and trends for analysis.",cat:"Marketing",emoji:"📣",agents:7,price1:39,priceMo:15,tokens:"300k tokens/month"},
  {id:45,sku:"AGENT-045",name:"Invoice Tracker",desc:"Automated invoice creation, sending, tracking, and payment reconciliation",story:"User uploads receipts. The system extracts data, creates invoices, sends them, and tracks payments.",cat:"Finance",emoji:"💰",agents:8,price1:39,priceMo:15,tokens:"200k tokens/month"},
  {id:46,sku:"AGENT-046",name:"Website Extractor",desc:"Scrapes and structures full website content: pages, metadata, links, images",story:"User pastes a website URL. The system extracts all pages, structures the content, and saves it for LLM use.",cat:"Platform",emoji:"🔌",agents:6,price1:29,priceMo:9,tokens:"200k tokens/month"},
  {id:47,sku:"AGENT-047",name:"AI Avatar Social Automation",desc:"AI avatar video + social posting: script, render, caption, schedule",story:"User records a short video. The system creates an AI avatar, generates social videos, and posts them across platforms.",cat:"Marketing",emoji:"📣",agents:11,price1:79,priceMo:29,tokens:"1M tokens/month"},
  {id:48,sku:"AGENT-048",name:"LinkedIn AI Agent",desc:"AI LinkedIn agent: connection requests, messages, content, lead tracking",story:"User connects LinkedIn. The system sends connection requests, messages, creates content, and tracks leads.",cat:"Sales",emoji:"🎯",agents:9,price1:59,priceMo:24,tokens:"500k tokens/month"},
  {id:49,sku:"AGENT-049",name:"Automated Sales Agents",desc:"End-to-end AI sales team: prospecting, outreach, qualification, close, CRM",story:"Sales team enters pipeline stage. The system prospects, outreaches, qualifies, closes deals, and updates CRM.",cat:"Sales",emoji:"🎯",agents:14,price1:99,priceMo:39,tokens:"1.5M tokens/month"},
];

const CATS = ['All','Sales','Marketing','Content','Operations','Service','Intelligence','Platform','Finance','HR'];

export default function Page() {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [priceType, setPriceType] = useState<'onetime'|'monthly'>('onetime');
  const [checkoutState, setCheckoutState] = useState<'idle'|'loading'|'fallback'>('idle');
  const [successSku, setSuccessSku] = useState('');

  const filtered = useMemo(() => {
    return PRODUCTS.filter(p => {
      const matchCat = activeTab === 'All' || p.cat === activeTab;
      const q = search.toLowerCase();
      const matchQ = !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [activeTab, search]);

  const openModal = (p: Product) => { setSelected(p); setPriceType('onetime'); setCheckoutState('idle'); };
  const closeModal = () => { setSelected(null); setCheckoutState('idle'); };

  const checkout = async () => {
    if (!selected) return;
    setCheckoutState('loading');
    const amount = priceType === 'onetime' ? selected.price1 : selected.priceMo;
    try {
      const r = await fetch('https://t4h-checkout-api.vercel.app/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: selected.name, sku: selected.sku, category: selected.cat,
          price_type: priceType, amount: amount * 100, currency: 'aud',
          success_url: window.location.origin + '/?success=1&sku=' + selected.sku,
          cancel_url: window.location.href,
          metadata: { sku: selected.sku, product_id: selected.id, brand: 'workfamilyai' }
        })
      });
      const d = await r.json();
      if (d.url) { window.location.href = d.url; return; }
    } catch {}
    setCheckoutState('fallback');
  };

  const amberGradient = 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)';

  return (
    <div style={{ background: '#f5f0e8', minHeight: '100vh', fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .ticker { background: #0a0a08; overflow: hidden; border-bottom: 2px solid #f59e0b; padding: 8px 0; white-space: nowrap; }
        .ticker-inner { display: inline-block; animation: ticker 35s linear infinite; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f59e0b; letter-spacing: 1px; }
        @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .bebas { font-family: 'Bebas Neue', cursive; letter-spacing: 2px; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .card { background: #fff; border: 2px solid #0a0a08; cursor: pointer; transition: background 0.12s; display: flex; flex-direction: column; padding: 24px; }
        .card:hover { background: #fffbf0; }
        .tab { border: 2px solid #0a0a08; background: transparent; color: #0a0a08; padding: 6px 14px; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; transition: all 0.12s; }
        .tab:hover { background: #0a0a08; color: #f5f0e8; }
        .tab.active { background: #0a0a08; color: #f59e0b; }
        .btn-deploy { background: #0a0a08; color: #f59e0b; border: none; font-family: 'Bebas Neue', cursive; font-size: 20px; letter-spacing: 2px; cursor: pointer; padding: 14px 24px; transition: background 0.12s; width: 100%; }
        .btn-deploy:hover { background: #1f1f1f; }
        .btn-deploy:disabled { opacity: 0.6; }
        .overlay { position: fixed; inset: 0; background: rgba(10,10,8,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal { background: #fff; border: 3px solid #0a0a08; width: min(680px, 96vw); max-height: 90vh; overflow-y: auto; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        .modal { animation: slideUp 0.18s ease; }
        .price-opt { border: 2px solid #e5e7eb; padding: 20px; cursor: pointer; text-align: center; transition: border-color 0.12s, background 0.12s; flex: 1; }
        .price-opt:hover, .price-opt.selected { border-color: #f59e0b; background: #fffbf0; }
        input[type=text] { border: 2px solid #0a0a08; background: #fff; padding: 8px 8px 8px 34px; font-family: 'JetBrains Mono', monospace; font-size: 12px; outline: none; width: 100%; }
        input[type=text]:focus { border-color: #f59e0b; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); background: #0a0a08; gap: 2px; }
      `}</style>

      {/* TICKER */}
      <div className="ticker">
        <span className="ticker-inner">
          ⚡ 49 AI Agents Available Now &nbsp;·&nbsp; Fully Automated &nbsp;·&nbsp; Deployed in Minutes &nbsp;·&nbsp; Sales · Marketing · Content · Operations · Finance · HR · Platform &nbsp;·&nbsp;
          ⚡ 49 AI Agents Available Now &nbsp;·&nbsp; Fully Automated &nbsp;·&nbsp; Deployed in Minutes &nbsp;·&nbsp; Sales · Marketing · Content · Operations · Finance · HR · Platform &nbsp;·&nbsp;
        </span>
      </div>

      {/* HEADER */}
      <header style={{ background: '#0a0a08', borderBottom: '3px solid #f59e0b', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="bebas" style={{ fontSize: 28, color: '#f5f0e8', lineHeight: 1 }}>
            WORK<span style={{ color: '#f59e0b' }}>FAMILY</span>AI
          </div>
          <div className="mono" style={{ fontSize: 9, color: '#6b7280', borderLeft: '1px solid #333', paddingLeft: 14, lineHeight: 1.5 }}>
            ONE-CLICK AUGMENTATION<br />49 AGENTS · ALL GATED
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#16a34a', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', padding: '4px 10px' }}>
            <span style={{ width: 6, height: 6, background: '#16a34a', borderRadius: '50%', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
            49 AGENTS · LIVE
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ background: '#0a0a08', padding: '72px 40px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 }}>
            <span style={{ flex: '0 0 40px', height: 1, background: '#f59e0b', display: 'inline-block' }} />
            ONE-CLICK AUGMENTATION
          </div>
          <h1 className="bebas" style={{ fontSize: 'clamp(72px,10vw,130px)', color: '#f5f0e8', lineHeight: 0.9, letterSpacing: 2, marginBottom: 8 }}>
            REPLACE<br />WORK.<br /><span style={{ color: '#f59e0b' }}>NOT</span><br />PEOPLE.
          </h1>
          <div style={{ width: '100%', height: 1, background: 'rgba(245,158,11,0.2)', margin: '24px 0' }} />
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap' }}>
            <p style={{ maxWidth: 480, fontSize: 16, lineHeight: 1.7, color: 'rgba(245,240,232,0.55)', fontWeight: 300 }}>
              Pick an agent. We handle contracts, compliance, infrastructure, onboarding, and deployment. You get results from day one — without hiring anyone.
            </p>
            <div style={{ display: 'flex', gap: 32 }}>
              {[['49','Agents'],['$29','Starts At'],['0','Devs Needed']].map(([n,l]) => (
                <div key={l} style={{ textAlign: 'right' }}>
                  <div className="bebas" style={{ fontSize: 52, color: '#f59e0b', lineHeight: 1 }}>{n}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'rgba(245,240,232,0.4)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <div style={{ background: '#f5f0e8', borderBottom: '2px solid #0a0a08', display: 'flex' }}>
        {[['01','Choose','Pick your agent'],['02','Pay','One-time or monthly'],['03','Deploy','We configure it'],['04','Run','Fully automated']].map(([n,l,s], i, arr) => (
          <div key={n} style={{ flex: 1, padding: '16px 24px', borderRight: i < arr.length-1 ? '1px solid rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="bebas" style={{ fontSize: 44, color: 'rgba(0,0,0,0.08)', lineHeight: 1 }}>{n}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{l}</div>
              <div className="mono" style={{ fontSize: 10, color: '#6b7280' }}>{s}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CONTROLS */}
      <div style={{ position: 'sticky', top: 68, zIndex: 90, background: '#f5f0e8', borderBottom: '2px solid #0a0a08' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 32px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280, minWidth: 160 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="SEARCH AGENTS..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATS.map(cat => (
              <button key={cat} className={`tab${activeTab === cat ? ' active' : ''}`} onClick={() => setActiveTab(cat)}>
                {cat} ({cat === 'All' ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === cat).length})
              </button>
            ))}
          </div>
          <div className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
            {filtered.length} AGENTS
          </div>
        </div>
      </div>

      {/* GRID */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px' }}>
        <div className="grid">
          {filtered.length === 0 ? (
            <div style={{ gridColumn: '1/-1', background: '#fff', padding: 80, textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 13, color: '#6b7280' }}>NO AGENTS MATCH · CLEAR FILTERS</div>
          ) : filtered.map(p => (
            <div key={p.id} className="card" onClick={() => openModal(p)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>{p.sku}</div>
                <div className="mono" style={{ fontSize: 9, background: '#0a0a08', color: '#f59e0b', padding: '3px 8px', letterSpacing: 1, textTransform: 'uppercase' }}>{p.cat}</div>
              </div>
              <div className="mono" style={{ fontSize: 9, color: '#6b7280', marginBottom: 8 }}>🤖 {p.agents} agents &nbsp;·&nbsp; {p.tokens}</div>
              <div className="bebas" style={{ fontSize: 22, color: '#0a0a08', lineHeight: 1.1, marginBottom: 10 }}>{p.name.toUpperCase()}</div>
              <div className="mono" style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 'auto' }}>{p.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 16 }}>
                <div>
                  <div className="bebas" style={{ fontSize: 36, color: '#0a0a08', lineHeight: 1 }}>${p.price1}</div>
                  <div className="mono" style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>ONE-TIME SETUP</div>
                  <div className="mono" style={{ fontSize: 9, color: '#16a34a', marginTop: 2 }}>+ ${p.priceMo}/mo to run</div>
                </div>
                <button className="bebas" style={{ background: '#0a0a08', color: '#f59e0b', border: 'none', fontSize: 16, letterSpacing: 1, padding: '10px 16px', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); openModal(p); }}>DEPLOY →</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer style={{ background: '#0a0a08', borderTop: '3px solid #f59e0b', padding: '32px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 10, color: '#6b7280' }}>
        WorkFamilyAI · One-Click Augmentation · ABN 70 666 271 272 · Payments via Stripe
      </footer>

      {/* MODAL */}
      {selected && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div style={{ background: '#0a0a08', padding: '24px 32px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div className="mono" style={{ fontSize: 9, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>{selected.sku} · {selected.cat} · {selected.agents} AGENTS</div>
                <div className="bebas" style={{ fontSize: 36, color: '#f5f0e8', lineHeight: 1, letterSpacing: 1 }}>{selected.name.toUpperCase()}</div>
              </div>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f5f0e8', fontSize: 16, width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>
            <div style={{ padding: 32 }}>
              {checkoutState === 'fallback' ? (
                <>
                  <div className="mono" style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.9, padding: 16, background: '#f5f0e8', border: '1px solid #e5e7eb', marginBottom: 24 }}>
                    <strong>Agent:</strong> {selected.name}<br />
                    <strong>SKU:</strong> {selected.sku}<br />
                    <strong>Amount:</strong> ${priceType === 'onetime' ? selected.price1 : selected.priceMo} AUD {priceType === 'onetime' ? 'one-time' : '/mo'}<br /><br />
                    Click below to email us — we'll send a payment link within the hour.
                  </div>
                  <a href={`mailto:troy@tech4humanity.com.au?subject=Deploy ${selected.sku}: ${selected.name}&body=Hi, I'd like to deploy ${selected.name} (${selected.sku}). Please send me a payment link.`}
                    style={{ display: 'block', background: '#0a0a08', color: '#f59e0b', textDecoration: 'none', textAlign: 'center', fontFamily: 'Bebas Neue', fontSize: 20, letterSpacing: 2, padding: 16 }}>
                    EMAIL TO DEPLOY →
                  </a>
                </>
              ) : (
                <>
                  <div className="mono" style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.9, padding: 16, background: '#f5f0e8', border: '1px solid #e5e7eb', marginBottom: 24 }}>{selected.story}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: '#0a0a08', marginBottom: 24 }}>
                    {[['Agents Deployed', `${selected.agents} AI agents`], ['Token Allocation', selected.tokens], ['Infrastructure', 'Full T4H stack'], ['Includes', 'Video + onboarding']].map(([l, v]) => (
                      <div key={l} style={{ background: '#fff', padding: '14px 16px' }}>
                        <div className="mono" style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{l}</div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 2, background: '#0a0a08', marginBottom: 24 }}>
                    {(['onetime', 'monthly'] as const).map(type => (
                      <div key={type} className={`price-opt${priceType === type ? ' selected' : ''}`} onClick={() => setPriceType(type)}>
                        <div className="mono" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 8 }}>{type === 'onetime' ? 'ONE-TIME SETUP' : 'MONTHLY SUBSCRIPTION'}</div>
                        <div className="bebas" style={{ fontSize: 44, color: '#0a0a08', lineHeight: 1 }}>${type === 'onetime' ? selected.price1 : selected.priceMo}</div>
                        <div className="mono" style={{ fontSize: 9, color: '#6b7280', marginTop: 4 }}>AUD {type === 'onetime' ? 'incl. onboarding' : 'per month'}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-deploy" onClick={checkout} disabled={checkoutState === 'loading'}>
                      {checkoutState === 'loading' ? 'CONNECTING...' : 'DEPLOY THIS AGENT →'}
                    </button>
                    <button onClick={closeModal} style={{ background: 'transparent', color: '#6b7280', border: '2px solid #e5e7eb', fontFamily: 'JetBrains Mono', fontSize: 11, padding: '14px 20px', cursor: 'pointer' }}>BACK</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
