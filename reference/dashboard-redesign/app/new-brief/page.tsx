"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageLayout } from "@/components/page-layout"
import { Zap, Settings2, ArrowRight, Calendar, DollarSign, Tag, FileText, Search, Brain, Sparkles, CheckCircle2, Loader2 } from 'lucide-react'

type Mode = 'simple' | 'detailed' | null
type Step = 'select' | 'form' | 'loading' | 'complete'

const categories = [
  'Marketing Agency',
  'Development Partner',
  'Design Studio',
  'Consulting Firm',
  'Cloud Provider',
  'Analytics Provider',
  'DevOps Partner',
  'Security Vendor',
]

const loadingSteps = [
  { id: 'search', label: 'Searching database', icon: Search, duration: 1500 },
  { id: 'analyze', label: 'Analyzing requirements', icon: Brain, duration: 2000 },
  { id: 'match', label: 'Matching vendors', icon: Sparkles, duration: 1800 },
  { id: 'score', label: 'Calculating scores', icon: CheckCircle2, duration: 1200 },
]

export default function NewBriefPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [step, setStep] = useState<Step>('select')
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0)
  
  // Form state
  const [briefName, setBriefName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [budget, setBudget] = useState(50000)
  const [deadline, setDeadline] = useState('')

  const handleModeSelect = (selectedMode: Mode) => {
    setMode(selectedMode)
    setStep('form')
  }

  const handleSubmit = async () => {
    setStep('loading')
    
    // Animate through loading steps
    for (let i = 0; i < loadingSteps.length; i++) {
      setCurrentLoadingStep(i)
      await new Promise(resolve => setTimeout(resolve, loadingSteps[i].duration))
    }
    
    setStep('complete')
    
    // Navigate to results after a brief pause
    setTimeout(() => {
      router.push('/results?brief=new')
    }, 800)
  }

  const formatBudget = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value}`
  }

  return (
    <PageLayout activePage="new-brief">
      <div className="flex-1 flex items-center justify-center py-8">
        {/* Mode Selection */}
        {step === 'select' && (
          <div className="w-full max-w-2xl animate-in fade-in duration-500">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-semibold text-white mb-3">Create New Brief</h1>
              <p className="text-[#919191]">Choose how you want to describe your sourcing needs</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Simple Mode Card */}
              <button
                onClick={() => handleModeSelect('simple')}
                className="group relative bg-[#0D0D0D] rounded-2xl p-8 border border-[#1F1F1F] hover:border-indigo-500/50 transition-all duration-300 text-left"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="h-14 w-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                  <Zap className="h-7 w-7 text-indigo-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Simple Mode</h3>
                <p className="text-[#919191] text-sm leading-relaxed">
                  Describe what you&apos;re looking for in plain text. Our AI will extract requirements automatically.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
                  <span>Quick &amp; Easy</span>
                  <span className="text-[#333]">•</span>
                  <span>1 min</span>
                </div>
              </button>

              {/* Detailed Mode Card */}
              <button
                onClick={() => handleModeSelect('detailed')}
                className="group relative bg-[#0D0D0D] rounded-2xl p-8 border border-[#1F1F1F] hover:border-indigo-500/50 transition-all duration-300 text-left"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="h-14 w-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                  <Settings2 className="h-7 w-7 text-indigo-400" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">Detailed Mode</h3>
                <p className="text-[#919191] text-sm leading-relaxed">
                  Specify exact requirements including budget, timeline, and category preferences.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
                  <span>Precise Results</span>
                  <span className="text-[#333]">•</span>
                  <span>3-5 min</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Form Step */}
        {step === 'form' && (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="mb-8">
              <button 
                onClick={() => setStep('select')}
                className="text-[#919191] hover:text-white transition-colors text-sm mb-4"
              >
                ← Back to mode selection
              </button>
              <h1 className="text-3xl font-semibold text-white mb-2">
                {mode === 'simple' ? 'Describe Your Needs' : 'Brief Details'}
              </h1>
              <p className="text-[#919191]">
                {mode === 'simple' 
                  ? 'Tell us what you\'re looking for in your own words' 
                  : 'Fill in the details to get precise matches'}
              </p>
            </div>

            <div className="bg-[#0D0D0D] rounded-2xl p-8 border border-[#1F1F1F]">
              {mode === 'simple' ? (
                /* Simple Mode Form */
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Brief Name
                    </label>
                    <input
                      type="text"
                      value={briefName}
                      onChange={(e) => setBriefName(e.target.value)}
                      placeholder="e.g., Marketing Agency Search"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      What are you looking for?
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your ideal vendor, partner, or service provider. Include any specific requirements, preferences, or constraints..."
                      rows={6}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                    />
                  </div>
                </div>
              ) : (
                /* Detailed Mode Form */
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <FileText className="h-4 w-4 inline mr-2 text-indigo-400" />
                      Brief Name
                    </label>
                    <input
                      type="text"
                      value={briefName}
                      onChange={(e) => setBriefName(e.target.value)}
                      placeholder="e.g., Enterprise SEO Agency Search"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <Tag className="h-4 w-4 inline mr-2 text-indigo-400" />
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-[#1A1A1A]">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#1A1A1A]">{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <DollarSign className="h-4 w-4 inline mr-2 text-indigo-400" />
                      Budget Range
                    </label>
                    <div className="space-y-3">
                      <input
                        type="range"
                        min={5000}
                        max={500000}
                        step={5000}
                        value={budget}
                        onChange={(e) => setBudget(Number(e.target.value))}
                        className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-sm">
                        <span className="text-[#919191]">$5K</span>
                        <span className="text-white font-medium">{formatBudget(budget)}</span>
                        <span className="text-[#919191]">$500K+</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <Calendar className="h-4 w-4 inline mr-2 text-indigo-400" />
                      Target Deadline
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <FileText className="h-4 w-4 inline mr-2 text-indigo-400" />
                      Project Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your project requirements, goals, and any specific criteria..."
                      rows={4}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!briefName.trim()}
                className="w-full mt-8 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#333] disabled:text-[#666] text-white font-medium rounded-xl transition-all duration-200"
              >
                <span>Run Brief</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Loading Step */}
        {step === 'loading' && (
          <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-12">
              <div className="h-20 w-20 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">Processing Brief</h1>
              <p className="text-[#919191]">Our AI is analyzing your requirements</p>
            </div>

            <div className="bg-[#0D0D0D] rounded-2xl p-6 border border-[#1F1F1F]">
              <div className="space-y-4">
                {loadingSteps.map((loadStep, index) => {
                  const isActive = index === currentLoadingStep
                  const isComplete = index < currentLoadingStep
                  const isPending = index > currentLoadingStep

                  return (
                    <div
                      key={loadStep.id}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
                        isActive ? 'bg-indigo-500/10 border border-indigo-500/30' :
                        isComplete ? 'bg-emerald-500/5' : 'opacity-40'
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${
                        isActive ? 'bg-indigo-500/20' :
                        isComplete ? 'bg-emerald-500/20' : 'bg-[#1A1A1A]'
                      }`}>
                        {isComplete ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : isActive ? (
                          <loadStep.icon className="h-5 w-5 text-indigo-400 animate-pulse" />
                        ) : (
                          <loadStep.icon className="h-5 w-5 text-[#666]" />
                        )}
                      </div>
                      <span className={`font-medium transition-colors ${
                        isActive ? 'text-white' :
                        isComplete ? 'text-emerald-400' : 'text-[#666]'
                      }`}>
                        {loadStep.label}
                      </span>
                      {isActive && (
                        <div className="ml-auto">
                          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className="w-full max-w-md text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="h-20 w-20 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Brief Complete!</h1>
            <p className="text-[#919191]">Redirecting to results...</p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
