"use client"

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PageLayout } from "@/components/page-layout"
import { 
  ArrowLeft, ExternalLink, Star, TrendingUp, CheckCircle, Award, Building2, Users, Globe, 
  DollarSign, ChevronDown, ChevronUp, Download, Share2, FileText, Brain, Search, 
  BarChart3, Shield, Zap, Clock
} from 'lucide-react'

interface CriteriaBreakdown {
  criteria: string
  matchPercent: number
  confidence: number
  notes: string
}

interface MatchResult {
  id: string
  rank: number
  name: string
  score: number
  category: string
  website: string
  location: string
  employeeCount: string
  priceRange: string
  reasons: string[]
  highlights: string[]
  considerations: string[]
  criteriaBreakdown?: CriteriaBreakdown[]
  aiReasoning?: {
    evaluation: string[]
    pagesAnalyzed: string[]
    signalsExtracted: string[]
    confidenceSummary: string
    rankingLogic: string
  }
}

const mockResults: MatchResult[] = [
  {
    id: "1",
    rank: 1,
    name: "Directive Consulting",
    score: 92,
    category: "B2B Marketing Agency",
    website: "directiveconsulting.com",
    location: "Irvine, CA",
    employeeCount: "50-200",
    priceRange: "$10K-50K/mo",
    reasons: [
      "Strong track record with enterprise SaaS clients",
      "Specialized in B2B demand generation and SEO",
      "Proven ROI-focused methodology with clear reporting",
      "Experience with similar tech stack and integrations"
    ],
    highlights: [
      "Featured in G2 Top 50 Agencies",
      "85% client retention rate",
      "Average 3x ROI for clients"
    ],
    considerations: [
      "Premium pricing tier",
      "6-month minimum engagement"
    ],
    criteriaBreakdown: [
      { criteria: 'Industry Experience', matchPercent: 98, confidence: 95, notes: '12+ SaaS clients in portfolio, 8 years B2B focus' },
      { criteria: 'Service Alignment', matchPercent: 94, confidence: 92, notes: 'Full-stack demand gen including SEO, PPC, content' },
      { criteria: 'Budget Compatibility', matchPercent: 88, confidence: 90, notes: 'Pricing aligns with mid-upper range of your budget' },
      { criteria: 'Team Size & Capacity', matchPercent: 91, confidence: 88, notes: 'Dedicated team structure, ~8 specialists per account' },
      { criteria: 'Geographic Fit', matchPercent: 95, confidence: 97, notes: 'US-based with proven remote collaboration' },
      { criteria: 'Technology Stack', matchPercent: 89, confidence: 85, notes: 'Experience with HubSpot, Salesforce, Marketo' },
    ],
    aiReasoning: {
      evaluation: [
        "Analyzed 47 data points across Directive Consulting's public presence and historical performance data.",
        "Cross-referenced client testimonials with industry benchmarks for B2B SaaS marketing agencies.",
        "Evaluated team composition and expertise alignment with your stated requirements.",
        "Compared pricing structure against market rates and your specified budget range.",
        "Assessed case study outcomes for similar company profiles (Series B+ SaaS, $10M-50M ARR)."
      ],
      pagesAnalyzed: [
        "directiveconsulting.com (main site, 23 pages)",
        "G2 Reviews (47 reviews analyzed)",
        "LinkedIn Company Page (team structure)",
        "Clutch.co Profile (12 case studies)",
        "Published content & thought leadership (Medium, LinkedIn articles)"
      ],
      signalsExtracted: [
        "High client retention rate (85%) indicates consistent delivery quality",
        "Average engagement length of 18 months suggests strong relationships",
        "ROI-focused messaging aligns with your efficiency requirements",
        "Recent hires in demand generation suggest capacity for new clients",
        "No negative signals in recent reviews or public mentions"
      ],
      confidenceSummary: "High confidence (92%) based on strong alignment across all primary criteria. The 8% uncertainty comes from limited visibility into current client load and exact team availability. Recommend direct conversation to validate capacity.",
      rankingLogic: "Ranked #1 due to exceptional industry experience score (98%), combined with strong service alignment (94%) and proven track record with similar client profiles. While budget compatibility (88%) is slightly lower than some alternatives, the quality indicators and retention data justify the premium positioning."
    }
  },
  {
    id: "2",
    rank: 2,
    name: "GrowthLab Media",
    score: 87,
    category: "Performance Marketing",
    website: "growthlabmedia.com",
    location: "Austin, TX",
    employeeCount: "20-50",
    priceRange: "$5K-25K/mo",
    reasons: [
      "Excellent performance marketing capabilities",
      "Strong B2B lead generation portfolio",
      "Agile team structure with dedicated account managers",
      "Competitive pricing for mid-market companies"
    ],
    highlights: [
      "Fast onboarding process (2 weeks)",
      "Flexible contract terms",
      "Real-time reporting dashboard"
    ],
    considerations: [
      "Smaller team size",
      "Limited international experience"
    ]
  },
  {
    id: "3",
    rank: 3,
    name: "Siege Media",
    score: 84,
    category: "Content & SEO Agency",
    website: "siegemedia.com",
    location: "San Diego, CA",
    employeeCount: "100-250",
    priceRange: "$15K-75K/mo",
    reasons: [
      "Industry-leading content marketing expertise",
      "Excellent link building and SEO capabilities",
      "Strong case studies in SaaS and technology",
      "Data-driven approach to content strategy"
    ],
    highlights: [
      "Published content strategy thought leader",
      "Proprietary content scoring system",
      "Extensive writer network"
    ],
    considerations: [
      "Content-focused, less paid media",
      "Longer ramp-up time (3-4 months)"
    ]
  },
  {
    id: "4",
    rank: 4,
    name: "Refine Labs",
    score: 79,
    category: "Demand Generation",
    website: "refinelabs.com",
    location: "Boston, MA",
    employeeCount: "50-100",
    priceRange: "$20K-60K/mo",
    reasons: [
      "Innovative demand generation methodology",
      "Strong LinkedIn and social selling expertise",
      "Modern attribution and measurement approach",
      "Active thought leadership presence"
    ],
    highlights: [
      "Popular B2B marketing podcast",
      "Dark social measurement pioneers",
      "Community-led growth experts"
    ],
    considerations: [
      "Higher price point",
      "Methodology-specific approach"
    ]
  },
  {
    id: "5",
    rank: 5,
    name: "Powered by Search",
    score: 74,
    category: "SEO & PPC Agency",
    website: "poweredbysearch.com",
    location: "Toronto, Canada",
    employeeCount: "20-50",
    priceRange: "$8K-30K/mo",
    reasons: [
      "Solid technical SEO capabilities",
      "Good balance of SEO and paid search",
      "Experience with B2B technology clients",
      "More accessible pricing structure"
    ],
    highlights: [
      "Technical SEO specialists",
      "Quick turnaround times",
      "Flexible engagement models"
    ],
    considerations: [
      "Time zone differences",
      "Smaller content team"
    ]
  }
]

function ResultsContent() {
  const searchParams = useSearchParams()
  const briefId = searchParams.get('brief')
  const [expandedCard, setExpandedCard] = useState<string | null>("1")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['criteria', 'reasoning']))

  const briefName = briefId === 'new' ? 'Your New Brief' : 'B2B SaaS Marketing Agency'

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 80) return 'text-indigo-400'
    if (score >= 70) return 'text-blue-400'
    return 'text-amber-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500'
    if (score >= 80) return 'bg-indigo-500'
    if (score >= 70) return 'bg-blue-500'
    return 'bg-amber-500'
  }

  return (
    <PageLayout activePage="results">
      {/* Back Navigation & Header */}
      <div className="flex flex-col gap-4">
        <Link 
          href="/history"
          className="flex items-center gap-2 text-[#919191] hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to History</span>
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">{briefName}</h1>
            <p className="text-[#919191] mt-1">Top 5 matched vendors based on your requirements</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#161B22] hover:bg-[#1F1F1F] text-white text-sm font-medium rounded-lg transition-colors border border-[#30363D]">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#161B22] hover:bg-[#1F1F1F] text-white text-sm font-medium rounded-lg transition-colors border border-[#30363D]">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-[#4F6EF7]/10 to-transparent rounded-2xl p-6 border border-[#4F6EF7]/20">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-[#4F6EF7]/20 flex items-center justify-center">
              <Award className="h-6 w-6 text-[#4F6EF7]" />
            </div>
            <div>
              <p className="text-[#919191] text-sm">Top Match</p>
              <p className="text-white font-semibold">{mockResults[0].name}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-[#30363D] hidden md:block" />
          <div>
            <p className="text-[#919191] text-sm">Highest Score</p>
            <p className="text-emerald-400 font-semibold text-lg">{mockResults[0].score}/100</p>
          </div>
          <div className="h-10 w-px bg-[#30363D] hidden md:block" />
          <div>
            <p className="text-[#919191] text-sm">Vendors Analyzed</p>
            <p className="text-white font-semibold text-lg">127</p>
          </div>
          <div className="h-10 w-px bg-[#30363D] hidden md:block" />
          <div>
            <p className="text-[#919191] text-sm">Processing Time</p>
            <p className="text-white font-semibold text-lg">6.4s</p>
          </div>
        </div>
      </div>

      {/* Results Cards */}
      <div className="space-y-4">
        {mockResults.map((result) => {
          const isExpanded = expandedCard === result.id
          const hasDetailedData = result.criteriaBreakdown && result.aiReasoning
          
          return (
            <div
              key={result.id}
              className={`bg-[#161B22] rounded-2xl border transition-all duration-300 ${
                result.rank === 1 
                  ? 'border-[#4F6EF7]/30 shadow-lg shadow-[#4F6EF7]/5' 
                  : 'border-[#30363D]'
              }`}
            >
              {/* Card Header */}
              <button
                onClick={() => setExpandedCard(isExpanded ? null : result.id)}
                className="w-full p-6 text-left"
              >
                <div className="flex items-start gap-4">
                  {/* Rank Badge */}
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                    result.rank === 1 ? 'bg-gradient-to-br from-[#4F6EF7] to-indigo-700' :
                    result.rank === 2 ? 'bg-gradient-to-br from-slate-400 to-slate-600' :
                    result.rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                    'bg-[#1F1F1F]'
                  }`}>
                    <span className="text-white font-bold text-lg">#{result.rank}</span>
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-semibold text-white">{result.name}</h3>
                      {result.rank === 1 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-[#4F6EF7]/20 text-[#4F6EF7] text-xs font-medium rounded-full">
                          <Star className="h-3 w-3" />
                          Best Match
                        </span>
                      )}
                    </div>
                    <p className="text-[#919191]">{result.category}</p>
                    
                    {/* Quick Stats */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                      <span className="flex items-center gap-1.5 text-[#919191]">
                        <Globe className="h-4 w-4" />
                        {result.location}
                      </span>
                      <span className="flex items-center gap-1.5 text-[#919191]">
                        <Users className="h-4 w-4" />
                        {result.employeeCount}
                      </span>
                      <span className="flex items-center gap-1.5 text-[#919191]">
                        <DollarSign className="h-4 w-4" />
                        {result.priceRange}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[#919191] text-sm mb-1">Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-[#0D1117] rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${getScoreBgColor(result.score)}`}
                            style={{ width: `${result.score}%` }}
                          />
                        </div>
                        <span className={`font-bold text-lg ${getScoreColor(result.score)}`}>
                          {result.score}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-[#919191]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#919191]" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-[#30363D] animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Basic Info Section */}
                  <div className="grid md:grid-cols-2 gap-6 mt-4">
                    {/* Why This Match */}
                    <div>
                      <h4 className="flex items-center gap-2 text-white font-medium mb-3">
                        <TrendingUp className="h-4 w-4 text-[#4F6EF7]" />
                        Why This Match
                      </h4>
                      <ul className="space-y-2">
                        {result.reasons.map((reason, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#919191]">
                            <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Highlights & Considerations */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="flex items-center gap-2 text-white font-medium mb-3">
                          <Star className="h-4 w-4 text-amber-400" />
                          Highlights
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {result.highlights.map((highlight, i) => (
                            <span 
                              key={i}
                              className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-sm rounded-lg"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="flex items-center gap-2 text-white font-medium mb-3">
                          <Building2 className="h-4 w-4 text-[#919191]" />
                          Considerations
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {result.considerations.map((consideration, i) => (
                            <span 
                              key={i}
                              className="px-3 py-1.5 bg-amber-500/10 text-amber-400 text-sm rounded-lg"
                            >
                              {consideration}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed View for Directive Consulting */}
                  {hasDetailedData && (
                    <div className="mt-6 space-y-4">
                      {/* Criteria Breakdown */}
                      <div className="bg-[#0D1117] rounded-xl border border-[#30363D] overflow-hidden">
                        <button
                          onClick={() => toggleSection('criteria')}
                          className="w-full flex items-center justify-between p-4 hover:bg-[#161B22] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <BarChart3 className="h-5 w-5 text-[#4F6EF7]" />
                            <span className="font-medium text-white">Criteria Breakdown</span>
                          </div>
                          {expandedSections.has('criteria') ? (
                            <ChevronUp className="h-5 w-5 text-[#919191]" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-[#919191]" />
                          )}
                        </button>
                        
                        {expandedSections.has('criteria') && (
                          <div className="px-4 pb-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-[#30363D]">
                                    <th className="text-left py-3 px-2 text-[#919191] font-medium">Criteria</th>
                                    <th className="text-center py-3 px-2 text-[#919191] font-medium">Match %</th>
                                    <th className="text-center py-3 px-2 text-[#919191] font-medium">Confidence</th>
                                    <th className="text-left py-3 px-2 text-[#919191] font-medium">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.criteriaBreakdown?.map((item, i) => (
                                    <tr key={i} className="border-b border-[#30363D]/50 last:border-0">
                                      <td className="py-3 px-2 text-white font-medium">{item.criteria}</td>
                                      <td className="py-3 px-2 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <div className="w-16 h-1.5 bg-[#30363D] rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full ${getScoreBgColor(item.matchPercent)}`}
                                              style={{ width: `${item.matchPercent}%` }}
                                            />
                                          </div>
                                          <span className={getScoreColor(item.matchPercent)}>{item.matchPercent}%</span>
                                        </div>
                                      </td>
                                      <td className="py-3 px-2 text-center">
                                        <span className="px-2 py-0.5 bg-[#4F6EF7]/10 text-[#4F6EF7] text-xs rounded-full">
                                          {item.confidence}%
                                        </span>
                                      </td>
                                      <td className="py-3 px-2 text-[#919191]">{item.notes}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Reasoning */}
                      <div className="bg-[#0D1117] rounded-xl border border-[#30363D] overflow-hidden">
                        <button
                          onClick={() => toggleSection('reasoning')}
                          className="w-full flex items-center justify-between p-4 hover:bg-[#161B22] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Brain className="h-5 w-5 text-purple-400" />
                            <span className="font-medium text-white">AI Reasoning</span>
                          </div>
                          {expandedSections.has('reasoning') ? (
                            <ChevronUp className="h-5 w-5 text-[#919191]" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-[#919191]" />
                          )}
                        </button>
                        
                        {expandedSections.has('reasoning') && result.aiReasoning && (
                          <div className="px-4 pb-4 space-y-6">
                            {/* Evaluation Steps */}
                            <div>
                              <h5 className="flex items-center gap-2 text-white font-medium mb-3">
                                <Zap className="h-4 w-4 text-amber-400" />
                                Evaluation Process
                              </h5>
                              <ol className="space-y-2">
                                {result.aiReasoning.evaluation.map((step, i) => (
                                  <li key={i} className="flex items-start gap-3 text-sm text-[#919191]">
                                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-[#4F6EF7]/20 text-[#4F6EF7] text-xs font-medium shrink-0">
                                      {i + 1}
                                    </span>
                                    {step}
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Pages Analyzed */}
                            <div>
                              <h5 className="flex items-center gap-2 text-white font-medium mb-3">
                                <Search className="h-4 w-4 text-blue-400" />
                                Pages Analyzed
                              </h5>
                              <div className="grid md:grid-cols-2 gap-2">
                                {result.aiReasoning.pagesAnalyzed.map((page, i) => (
                                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#161B22] rounded-lg text-sm text-[#919191]">
                                    <FileText className="h-4 w-4 text-[#30363D]" />
                                    {page}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Signals Extracted */}
                            <div>
                              <h5 className="flex items-center gap-2 text-white font-medium mb-3">
                                <Shield className="h-4 w-4 text-emerald-400" />
                                Signals Extracted
                              </h5>
                              <ul className="space-y-2">
                                {result.aiReasoning.signalsExtracted.map((signal, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-[#919191]">
                                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                    {signal}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Confidence Summary */}
                            <div className="p-4 bg-[#4F6EF7]/5 rounded-xl border border-[#4F6EF7]/20">
                              <h5 className="flex items-center gap-2 text-white font-medium mb-2">
                                <Clock className="h-4 w-4 text-[#4F6EF7]" />
                                Confidence Summary
                              </h5>
                              <p className="text-sm text-[#C9D1D9] leading-relaxed">
                                {result.aiReasoning.confidenceSummary}
                              </p>
                            </div>

                            {/* Ranking Logic */}
                            <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/20">
                              <h5 className="flex items-center gap-2 text-white font-medium mb-2">
                                <Award className="h-4 w-4 text-purple-400" />
                                Ranking Logic
                              </h5>
                              <p className="text-sm text-[#C9D1D9] leading-relaxed">
                                {result.aiReasoning.rankingLogic}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Placeholder for other results */}
                  {!hasDetailedData && (
                    <div className="mt-6 p-4 bg-[#0D1117] rounded-xl border border-[#30363D] text-center">
                      <p className="text-[#919191] text-sm">
                        Detailed AI reasoning available for top match only. 
                        <button className="text-[#4F6EF7] hover:underline ml-1">Upgrade to view all</button>
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[#30363D]">
                    <a
                      href={`https://${result.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Visit Website
                    </a>
                    <button className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white text-sm font-medium rounded-lg transition-colors border border-[#30363D]">
                      Save to Shortlist
                    </button>
                    <button className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white text-sm font-medium rounded-lg transition-colors border border-[#30363D]">
                      Request Intro
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </PageLayout>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <PageLayout activePage="results">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-[#4F6EF7] border-t-transparent rounded-full" />
        </div>
      </PageLayout>
    }>
      <ResultsContent />
    </Suspense>
  )
}
