import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free AI Readiness Assessment | WorkFamilyAI",
  description: "10 questions. Instant score. Discover your organisation's AI readiness profile across 9 cognitive dimensions — free, no card required.",
};

export default function ReadinessPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is the WorkFamilyAI Readiness Assessment?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A free 10-question diagnostic that scores your organisation across 9 cognitive profiles from the ASS-2 research programme. You receive an instant readiness score, your dominant cognitive profile, and a personalised AI adoption roadmap — at no cost, with no credit card required."
        }
      },
      {
        "@type": "Question",
        "name": "How long does it take?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Under 3 minutes. 10 questions, instant results delivered on screen."
        }
      },
      {
        "@type": "Question",
        "name": "What do I get from the assessment?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Your AI Readiness Score (0–100), your dominant cognitive profile from the ASS-2 9-profile framework, your highest-impact first automation (matched to your profile), and a recommended adoption pathway to the Neural Ennead."
        }
      },
      {
        "@type": "Question",
        "name": "Does this connect to a paid product?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes — but there is no pressure. The assessment is genuinely free and valuable on its own. If your score indicates high readiness, you will see a recommended next step: the Ennead Companion License at $75/month, or an Agentic Org Diagnostic for enterprise-scale deployment."
        }
      }
    ]
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <header className="text-center mb-12">
        <div className="inline-block bg-green-900/30 border border-green-700/50 text-green-400 text-sm font-mono px-3 py-1 rounded mb-4">
          FREE · NO CARD · INSTANT RESULTS
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">WorkFamily AI Readiness Score</h1>
        <p className="text-xl text-gray-300">
          10 questions. Discover your cognitive profile. Get your personalised AI adoption roadmap.
        </p>
      </header>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 mb-10">
        <div className="grid grid-cols-3 gap-6 text-center mb-8">
          <div>
            <div className="text-2xl font-bold text-green-400">10</div>
            <div className="text-sm text-gray-400">Questions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">3 min</div>
            <div className="text-sm text-gray-400">Completion time</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">9</div>
            <div className="text-sm text-gray-400">Cognitive profiles</div>
          </div>
        </div>

        <h2 className="text-xl font-semibold text-white mb-4">What you will receive</h2>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Your AI Readiness Score (0–100) with benchmarks against 11,241 ASS-2 participants</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Your dominant cognitive profile — one of 9 archetypes from the ASS-2 research programme</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Your highest-impact first automation, matched to your profile and business type</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 mt-0.5">✓</span>
            <span>Your recommended Neural Ennead entry domain</span>
          </li>
        </ul>

        <div className="mt-8 text-center">
          <a
            href="/assessment"
            className="inline-block bg-green-600 hover:bg-green-500 text-white px-10 py-4 rounded-lg text-lg font-semibold transition"
          >
            Start Free Assessment
          </a>
          <p className="text-sm text-gray-500 mt-3">No account required. Results delivered instantly.</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqSchema.mainEntity.map((faq, i) => (
            <div key={i} className="border-b border-gray-700 pb-6">
              <h3 className="text-lg font-semibold text-white mb-2">{faq.name}</h3>
              <p className="text-gray-300">{faq.acceptedAnswer.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
