"use client"

import { useState } from 'react'
import { Header } from "@/components/header"
import { 
  User, Building2, CreditCard, Puzzle, Bell, Shield, MonitorSmartphone, AlertTriangle,
  Upload, Check, ExternalLink, X
} from 'lucide-react'

const navSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', icon: Puzzle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'sessions', label: 'Sessions', icon: MonitorSmartphone },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
]

const integrations = [
  { id: 'hubspot', name: 'HubSpot', description: 'CRM & Marketing Automation', connected: true },
  { id: 'slack', name: 'Slack', description: 'Team Communication', connected: true },
  { id: 'gdrive', name: 'Google Drive', description: 'File Storage & Collaboration', connected: false },
  { id: 'zapier', name: 'Zapier', description: 'Workflow Automation', connected: false },
]

const sessions = [
  { device: 'MacBook Pro', location: 'San Francisco, CA', lastActive: '2 minutes ago', current: true },
  { device: 'iPhone 15 Pro', location: 'San Francisco, CA', lastActive: '1 hour ago', current: false },
  { device: 'Windows Desktop', location: 'New York, NY', lastActive: '3 days ago', current: false },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showBillingModal, setShowBillingModal] = useState(false)
  
  // Form states
  const [profile, setProfile] = useState({
    name: 'Alex Thompson',
    role: 'Product Manager',
    email: 'alex@connexa.ai',
    phone: '+1 (555) 123-4567'
  })
  
  const [company, setCompany] = useState({
    name: 'ConnexaAI Inc.',
    website: 'https://connexa.ai',
    size: '50-200',
    industry: 'Technology',
    description: 'AI-powered B2B sourcing platform helping enterprises find and evaluate vendors.'
  })
  
  const [notifications, setNotifications] = useState({
    email: true,
    weekly: true,
    matchAlerts: true,
    productUpdates: false
  })
  
  const [security, setSecurity] = useState({
    twoFactor: false,
    lastPasswordChange: 'January 15, 2026'
  })
  
  const [integrationsState, setIntegrationsState] = useState(integrations)

  const handleSave = () => {
    setSaveState('saving')
    setTimeout(() => {
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    }, 1000)
  }

  const toggleIntegration = (id: string) => {
    setIntegrationsState(prev => 
      prev.map(int => int.id === id ? { ...int, connected: !int.connected } : int)
    )
  }

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen w-full bg-[#0D1117] text-white">
      <Header />
      
      <div className="flex pt-24 px-6 pb-6 gap-6 max-w-7xl mx-auto">
        {/* Left Navigation */}
        <aside className="hidden md:block w-56 shrink-0">
          <div className="sticky top-24 bg-[#161B22] rounded-2xl p-4 border border-[#30363D]">
            <h2 className="text-sm font-medium text-[#919191] uppercase tracking-wider mb-4 px-3">Settings</h2>
            <nav className="space-y-1">
              {navSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'bg-[#4F6EF7]/10 text-[#4F6EF7]'
                      : section.id === 'danger' 
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-[#919191] hover:bg-[#1F1F1F] hover:text-white'
                  }`}
                >
                  <section.icon className="h-4 w-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* Profile Section */}
          <section id="profile" className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
            <h3 className="text-lg font-semibold text-white mb-6">Profile</h3>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex flex-col items-center gap-3">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#4F6EF7] to-indigo-700 flex items-center justify-center text-2xl font-bold">
                  AT
                </div>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-sm text-white rounded-lg transition-colors border border-[#30363D]">
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
              </div>
              <div className="flex-1 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#919191] mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#919191] mb-2">Role / Title</label>
                  <input
                    type="text"
                    value={profile.role}
                    onChange={(e) => setProfile(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#919191] mb-2">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#919191] mb-2">Phone</label>
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  saveState === 'saved' 
                    ? 'bg-emerald-600 text-white scale-105' 
                    : saveState === 'saving'
                      ? 'bg-[#4F6EF7]/50 text-white cursor-wait'
                      : 'bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white hover:scale-105'
                }`}
              >
                {saveState === 'saved' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved
                  </>
                ) : saveState === 'saving' ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </section>

          {/* Company Section */}
          <section id="company" className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
            <h3 className="text-lg font-semibold text-white mb-6">Company</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#919191] mb-2">Company Name</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany(c => ({ ...c, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#919191] mb-2">Website</label>
                <input
                  type="url"
                  value={company.website}
                  onChange={(e) => setCompany(c => ({ ...c, website: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-[#919191] mb-2">Company Size</label>
                <select
                  value={company.size}
                  onChange={(e) => setCompany(c => ({ ...c, size: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors appearance-none cursor-pointer"
                >
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="50-200">50-200 employees</option>
                  <option value="200-500">200-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#919191] mb-2">Industry</label>
                <select
                  value={company.industry}
                  onChange={(e) => setCompany(c => ({ ...c, industry: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors appearance-none cursor-pointer"
                >
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-[#919191] mb-2">Description</label>
                <textarea
                  value={company.description}
                  onChange={(e) => setCompany(c => ({ ...c, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:outline-none focus:border-[#4F6EF7] transition-colors resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white rounded-lg font-medium text-sm transition-all hover:scale-105"
              >
                Save Changes
              </button>
            </div>
          </section>

          {/* Plan & Billing Section */}
          <section id="billing" className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
            <h3 className="text-lg font-semibold text-white mb-6">Plan & Billing</h3>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 p-4 bg-gradient-to-br from-[#4F6EF7]/10 to-transparent rounded-xl border border-[#4F6EF7]/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[#4F6EF7] text-sm font-medium">CURRENT PLAN</span>
                </div>
                <h4 className="text-2xl font-bold text-white mb-1">Business Pro</h4>
                <p className="text-[#919191] text-sm mb-4">$299/month</p>
                <p className="text-[#919191] text-sm">Next renewal: March 15, 2026</p>
              </div>
              <div className="flex-1 p-4 bg-[#0D1117] rounded-xl border border-[#30363D]">
                <p className="text-[#919191] text-sm mb-2">Payment Method</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-14 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
                  <div>
                    <p className="text-white font-medium">Visa ending in 4242</p>
                    <p className="text-[#919191] text-sm">Expires 12/27</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBillingModal(true)}
                className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white rounded-lg text-sm font-medium transition-colors border border-[#30363D]"
              >
                Manage Billing
              </button>
              <button className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white rounded-lg text-sm font-medium transition-colors border border-[#30363D]">
                View Invoices
              </button>
            </div>
          </section>

          {/* Integrations Section */}
          <section id="integrations" className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
            <h3 className="text-lg font-semibold text-white mb-6">Integrations</h3>
            <div className="space-y-3">
              {integrationsState.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 bg-[#0D1117] rounded-xl border border-[#30363D]"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-[#1F1F1F] flex items-center justify-center">
                      <Puzzle className="h-5 w-5 text-[#919191]" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{integration.name}</p>
                      <p className="text-[#919191] text-sm">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      integration.connected
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-[#1F1F1F] text-[#919191]'
                    }`}>
                      {integration.connected ? 'Connected' : 'Not Connected'}
                    </span>
                    <button
                      onClick={() => toggleIntegration(integration.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        integration.connected
                          ? 'bg-[#1F1F1F] hover:bg-red-500/10 text-[#919191] hover:text-red-400 border border-[#30363D]'
                          : 'bg-[#4F6EF7] hover:bg-[#4F6EF7]/90 text-white'
                      }`}
                    >
                      {integration.connected ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Notifications Section */}
          <section id="notifications" className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
            <h3 className="text-lg font-semibold text-white mb-6">Notifications</h3>
            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
                { key: 'weekly', label: 'Weekly Insights', description: 'Get a weekly summary of your AI activity' },
                { key: 'matchAlerts', label: 'Match Alerts', description: 'Be notified when high-confidence matches are found' },
                { key: 'productUpdates', label: 'Product Updates', description: 'Learn about new features and improvements' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-4 bg-[#0D1117] rounded-xl border border-[#30363D]">
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-[#919191] text-sm">{item.description}</p>
                  </div>
                  <button
                    onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key as keyof typeof notifications] }))}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      notifications[item.key as keyof typeof notifications] ? 'bg-[#4F6EF7]' : 'bg-[#30363D]'
                    }`}
                  >
                    <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                      notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Security Section */}
          <section id="security" className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
            <h3 className="text-lg font-semibold text-white mb-6">Security</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#0D1117] rounded-xl border border-[#30363D]">
                <div>
                  <p className="text-white font-medium">Password</p>
                  <p className="text-[#919191] text-sm">Last changed: {security.lastPasswordChange}</p>
                </div>
                <button className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white rounded-lg text-sm font-medium transition-colors border border-[#30363D]">
                  Change Password
                </button>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#0D1117] rounded-xl border border-[#30363D]">
                <div>
                  <p className="text-white font-medium">Two-Factor Authentication</p>
                  <p className="text-[#919191] text-sm">Add an extra layer of security to your account</p>
                </div>
                <button
                  onClick={() => setSecurity(s => ({ ...s, twoFactor: !s.twoFactor }))}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    security.twoFactor ? 'bg-[#4F6EF7]' : 'bg-[#30363D]'
                  }`}
                >
                  <div className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                    security.twoFactor ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </section>

          {/* Sessions Section */}
          <section id="sessions" className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
            <h3 className="text-lg font-semibold text-white mb-6">Sessions</h3>
            <div className="space-y-3">
              {sessions.map((session, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#0D1117] rounded-xl border border-[#30363D]">
                  <div className="flex items-center gap-4">
                    <MonitorSmartphone className="h-5 w-5 text-[#919191]" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{session.device}</p>
                        {session.current && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full">Current</span>
                        )}
                      </div>
                      <p className="text-[#919191] text-sm">{session.location} · {session.lastActive}</p>
                    </div>
                  </div>
                  {!session.current && (
                    <button className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="mt-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors">
              Log out of all devices
            </button>
          </section>

          {/* Danger Zone */}
          <section id="danger" className="bg-[#161B22] rounded-2xl p-6 border border-red-500/30">
            <h3 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h3>
            <p className="text-[#919191] text-sm mb-6">Irreversible and destructive actions</p>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors">
                Reset All AI Data
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Delete Account
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161B22] rounded-2xl p-6 w-full max-w-md border border-[#30363D] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Delete Account</h3>
              <button onClick={() => setShowDeleteModal(false)} className="text-[#919191] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-[#919191] mb-6">
              Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white rounded-lg text-sm font-medium transition-colors border border-[#30363D]"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161B22] rounded-2xl p-6 w-full max-w-md border border-[#30363D] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Manage Billing</h3>
              <button onClick={() => setShowBillingModal(false)} className="text-[#919191] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <button className="w-full flex items-center justify-between p-4 bg-[#0D1117] hover:bg-[#1F1F1F] rounded-xl border border-[#30363D] transition-colors">
                <span className="text-white">Update Payment Method</span>
                <ExternalLink className="h-4 w-4 text-[#919191]" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-[#0D1117] hover:bg-[#1F1F1F] rounded-xl border border-[#30363D] transition-colors">
                <span className="text-white">Change Plan</span>
                <ExternalLink className="h-4 w-4 text-[#919191]" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-[#0D1117] hover:bg-[#1F1F1F] rounded-xl border border-[#30363D] transition-colors">
                <span className="text-white">Download Invoices</span>
                <ExternalLink className="h-4 w-4 text-[#919191]" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 transition-colors">
                <span className="text-red-400">Cancel Subscription</span>
                <ExternalLink className="h-4 w-4 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
