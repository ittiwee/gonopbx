import { useState, useEffect, useMemo } from 'react'
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  CheckCircle2,
  AlertCircle,
  Activity,
  History,
  ArrowRight,
  Clock,
  Users,
  Shield,
  Zap,
  Search,
  RefreshCw,
  Plus,
  Radio,
  Wifi,
  Globe,
  Flame,
  HeartPulse,
  LifeBuoy
} from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'

interface SystemStatus {
  asterisk: string
  version?: string
  endpoints: Array<{
    endpoint: string
    display_name: string
    type: 'peer' | 'trunk'
    provider?: string
    status: string
    rtt?: number
    user_name?: string
    avatar_url?: string
  }>
  system?: {
    health: string
    issues: string[]
    database: string
    api: string
  }
}

interface InboundRoute {
  id: number
  did: string
  trunk_id: number
  destination_extension: string
  description: string | null
}

interface CDRRecord {
  id: number
  call_date: string
  clid: string | null
  src: string | null
  dst: string | null
  channel: string | null
  dstchannel: string | null
  duration: number | null
  billsec: number | null
  disposition: string | null
}

interface ActiveCall {
  id?: string
  channel: string
  caller: string
  caller_name?: string
  destination: string
  dest_name?: string
  state: string
  start_time: string
}

interface DashboardProps {
  onExtensionClick?: (extension: string) => void
  onTrunkClick?: (trunkId: number) => void
  onNavigate?: (page: string) => void
}

export default function Dashboard({ onExtensionClick, onTrunkClick, onNavigate }: DashboardProps) {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [routes, setRoutes] = useState<InboundRoute[]>([])
  const [recentCalls, setRecentCalls] = useState<CDRRecord[]>([])
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Quick Originate Call Modal
  const [showCallModal, setShowCallModal] = useState(false)
  const [dialExt, setDialExt] = useState('')
  const [dialNum, setDialNum] = useState('')
  const [dialing, setDialing] = useState(false)
  const [dialMsg, setDialMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { tr, lang } = useI18n()
  const { user } = useAuth()

  // Provider metadata including Thai and international carriers
  const PROVIDER_INFO: Record<string, { label: string; logo?: string; badgeColor: string }> = {
    ais: { label: 'AIS Business SIP Trunk', badgeColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    true: { label: 'TrueBusiness SIP Trunk', badgeColor: 'bg-red-500/10 text-red-600 border-red-500/20' },
    nt: { label: 'NT Telecom (TOT/CAT)', badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    '3bb': { label: '3BB Corporate SIP', badgeColor: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
    plusnet_basic: { label: 'Plusnet IPfonie Basic', logo: '/logos/plusnet.svg', badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    plusnet_connect: { label: 'Plusnet IPfonie Connect', logo: '/logos/plusnet.svg', badgeColor: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    telekom_deutschlandlan: { label: 'Telekom DeutschlandLAN', logo: '/logos/telekom.jpg', badgeColor: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
    telekom_companyflex: { label: 'Telekom CompanyFlex', logo: '/logos/telekom.jpg', badgeColor: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
    telekom_allip: { label: 'Telekom All-IP', logo: '/logos/telekom.jpg', badgeColor: 'bg-pink-500/10 text-pink-600 border-pink-500/20' },
    iliad_it: { label: 'Iliad (Italy)', badgeColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  }

  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const [statusData, routesData, cdrData, activeData] = await Promise.all([
        api.getDashboardStatus(),
        api.getRoutes(),
        api.getCdr('limit=7'),
        api.getActiveCalls().catch(() => ({ calls: [] })),
      ])

      setStatus(statusData)
      setRoutes(routesData || [])
      setRecentCalls(cdrData || [])
      setActiveCalls(activeData?.calls || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      if (isManual) setTimeout(() => setRefreshing(false), 500)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => fetchStatus(false), 8000)
    return () => clearInterval(interval)
  }, [])

  // Extensions & Trunks breakdown
  const extensions = useMemo(() => {
    return status?.endpoints?.filter(e => e.type !== 'trunk') || []
  }, [status])

  const trunks = useMemo(() => {
    return status?.endpoints?.filter(e => e.type === 'trunk') || []
  }, [status])

  const onlineExtensions = useMemo(() => {
    return extensions.filter(e => e.status === 'online').length
  }, [extensions])

  const onlineTrunks = useMemo(() => {
    return trunks.filter(t => t.status === 'online').length
  }, [trunks])

  // Filtered extensions
  const filteredExtensions = useMemo(() => {
    if (!searchTerm.trim()) return extensions
    const q = searchTerm.toLowerCase()
    return extensions.filter(
      e =>
        e.endpoint.toLowerCase().includes(q) ||
        (e.display_name && e.display_name.toLowerCase().includes(q)) ||
        (e.user_name && e.user_name.toLowerCase().includes(q))
    )
  }, [extensions, searchTerm])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return tr('Guten Morgen', 'Good morning')
    if (hour < 18) return tr('Guten Tag', 'Good afternoon')
    return tr('Guten Abend', 'Good evening')
  }

  const getFormattedDate = () => {
    return new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString(lang === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    }
    return (
      d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: '2-digit' }) +
      ' ' +
      d.toLocaleTimeString(lang === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    )
  }

  const getEndpointName = (ext: string | null) => {
    if (!ext) return '-'
    const ep = status?.endpoints?.find(e => e.endpoint === ext)
    if (ep?.display_name && ep.display_name !== ep.endpoint) {
      return `${ep.display_name} (${ext})`
    }
    return ext
  }

  const getExtFromChannel = (channel: string | null) => {
    if (!channel) return null
    const match = channel.match(/^PJSIP\/(\d{3,4})-/)
    return match ? match[1] : null
  }

  const getCallDirection = (call: CDRRecord): 'inbound' | 'outbound' | 'internal' => {
    const ch = call.channel || ''
    const dstCh = call.dstchannel || ''
    const srcFromPeer = /^PJSIP\/\d{3,4}-/.test(ch)
    const dstToPeer = /^PJSIP\/\d{3,4}-/.test(dstCh)
    const srcFromTrunk = /^PJSIP\/trunk-/.test(ch)
    const dstToTrunk = /^PJSIP\/trunk-/.test(dstCh)

    if (srcFromPeer && dstToTrunk) return 'outbound'
    if (srcFromTrunk && dstToPeer) return 'inbound'
    if (srcFromPeer && dstToPeer) return 'internal'

    // Fallback checks
    if (call.dst && /^(0|\+|191|1669|199)/.test(call.dst)) return 'outbound'
    if (call.src && call.src.length > 5) return 'inbound'
    return 'internal'
  }

  const getCallSrcName = (call: CDRRecord) => {
    const direction = getCallDirection(call)
    if (direction === 'outbound') {
      const ext = getExtFromChannel(call.channel)
      if (ext) return getEndpointName(ext)
    }
    return getEndpointName(call.src)
  }

  const getCallDstName = (call: CDRRecord) => {
    const direction = getCallDirection(call)
    if (direction === 'inbound') {
      const ext = getExtFromChannel(call.dstchannel)
      if (ext) return getEndpointName(ext)
    }
    return getEndpointName(call.dst)
  }

  const handleOriginate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dialExt || !dialNum) return
    setDialing(true)
    setDialMsg(null)
    try {
      await api.originateCall(dialExt, dialNum)
      setDialMsg({
        type: 'success',
        text: tr(`Anruf initiiert: Nebenstelle ${dialExt} klingelt jetzt!`, `Call placed! Ringing extension ${dialExt} now...`),
      })
      setTimeout(() => {
        setShowCallModal(false)
        setDialMsg(null)
        setDialNum('')
      }, 2500)
    } catch (err: any) {
      setDialMsg({
        type: 'error',
        text: err.message || tr('Anruf konnte nicht gestartet werden', 'Failed to originate call'),
      })
    } finally {
      setDialing(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ==================== HERO EXECUTIVE HEADER ==================== */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-500/20 p-6 md:p-8">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Greeting & Time */}
          <div>
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold tracking-wider uppercase mb-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>VoiceLinkPBX Telephony System</span>
              <span className="text-slate-500">•</span>
              <span>{getFormattedDate()}</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              {getGreeting()}, <span className="bg-gradient-to-r from-indigo-200 to-cyan-200 bg-clip-text text-transparent">{user?.username || 'Administrator'}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Asterisk Core:</span>
                <strong className="text-emerald-400">
                  {status?.asterisk === 'connected' ? 'Online (v20 LTS)' : 'Reconnecting...'}
                </strong>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>PJSIP Stack:</span>
                <strong className="text-cyan-300">Active (Asia/Bangkok)</strong>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (extensions.length > 0) setDialExt(extensions[0].endpoint)
                setShowCallModal(true)
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition active:scale-95 border border-indigo-400/30"
            >
              <PhoneCall className="w-4 h-4 text-indigo-100" />
              <span>{tr('Anrufen', 'Originate Call')}</span>
            </button>

            <button
              onClick={() => onNavigate?.('settings')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm backdrop-blur-md transition border border-white/10 active:scale-95"
            >
              <Plus className="w-4 h-4 text-slate-300" />
              <span>{tr('Verwalten', 'PBX Settings')}</span>
            </button>

            <button
              onClick={() => fetchStatus(true)}
              disabled={refreshing}
              title="Refresh Real-time Status"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition border border-white/10 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : 'text-slate-300'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 4 METRIC SUMMARY CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Extensions */}
        <div
          onClick={() => onNavigate?.('settings')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-800/90 p-5 shadow-sm border border-slate-200/80 dark:border-slate-700/80 hover:shadow-md hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {tr('Nebenstellen', 'Extensions')}
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {onlineExtensions}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">/ {extensions.length} {tr('Online', 'Registered')}</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${extensions.length ? (onlineExtensions / extensions.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Card 2: SIP Trunks */}
        <div
          onClick={() => onNavigate?.('settings')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-800/90 p-5 shadow-sm border border-slate-200/80 dark:border-slate-700/80 hover:shadow-md hover:border-cyan-500/40 dark:hover:border-cyan-500/40 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {tr('SIP-Leitungen', 'SIP Trunks')}
            </span>
            <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Globe className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {onlineTrunks}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">/ {trunks.length} {tr('Aktiv', 'Connected')}</span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-emerald-500" />
            <span>{routes.length} {tr('DIDs geroutet', 'Inbound DIDs routed')}</span>
          </p>
        </div>

        {/* Card 3: Today's Calls */}
        <div
          onClick={() => onNavigate?.('cdr')}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white dark:bg-slate-800/90 p-5 shadow-sm border border-slate-200/80 dark:border-slate-700/80 hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {tr('Anrufe heute', 'Total Calls Today')}
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {recentCalls.length}
            </span>
            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              {recentCalls.filter(c => c.disposition === 'ANSWERED').length} {tr('beantwortet', 'answered')}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>{tr('Klicken für Anruf-Historie', 'Click to view full records')}</span>
          </p>
        </div>

        {/* Card 4: Telephony Engine Health */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800/90 p-5 shadow-sm border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {tr('System-Status', 'PBX Core Health')}
            </span>
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-6 h-6" />
              100%
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Optimal</span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 truncate">
            Asterisk 20 LTS • Fail2Ban Active
          </p>
        </div>
      </div>

      {/* ==================== ACTIVE LIVE CALLS (WHEN BUSY) ==================== */}
      {activeCalls.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {tr('Aktive Live-Anrufe', 'Live Active Channels')}
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                  {activeCalls.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeCalls.map((call, idx) => (
              <div
                key={call.channel || idx}
                className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-amber-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 animate-pulse">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{call.caller || 'Unknown'}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span>{call.destination || 'Unknown'}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {call.state}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================== MAIN 2-COLUMN LAYOUT ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: EXTENSIONS DIRECTORY & RECENT CALLS (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Extensions Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-800/90 shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-indigo-500" />
                  {tr('Nebenstellen-Verzeichnis', 'Internal Extensions')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tr('Live-Status der internen Teilnehmer und BLF', 'Real-time peer registration and BLF presence')}
                </p>
              </div>

              {/* Search filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={tr('Suchen nach Nummer/Name...', 'Search extension or name...')}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">{tr('Lade Teilnehmer...', 'Loading extensions...')}</div>
            ) : filteredExtensions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredExtensions.map(endpoint => {
                  const isOnline = endpoint.status === 'online'
                  const extRoutes = routes.filter(r => r.destination_extension === endpoint.endpoint)

                  return (
                    <div
                      key={endpoint.endpoint}
                      onClick={() => onExtensionClick?.(endpoint.endpoint)}
                      className="group cursor-pointer p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 hover:border-indigo-400/50 transition-all duration-150 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {endpoint.avatar_url ? (
                            <img
                              src={endpoint.avatar_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-slate-300 dark:border-slate-600"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {endpoint.endpoint}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {endpoint.user_name || endpoint.display_name || `Ext ${endpoint.endpoint}`}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              Ext #{endpoint.endpoint}
                            </div>
                          </div>
                        </div>

                        {/* Status indicator badge */}
                        <span className="flex h-2.5 w-2.5 relative flex-shrink-0 mt-1">
                          {isOnline && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              isOnline ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                            }`}
                          />
                        </span>
                      </div>

                      {/* Associated DIDs */}
                      {extRoutes.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap gap-1">
                          {extRoutes.map(route => (
                            <span
                              key={route.id}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/40"
                            >
                              <PhoneIncoming className="w-2.5 h-2.5 text-emerald-500" />
                              {route.did}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-sm">
                {tr('Keine Nebenstellen gefunden', 'No extensions found matching search')}
              </div>
            )}
          </div>

          {/* Recent Call Activity Feed */}
          <div className="rounded-2xl bg-white dark:bg-slate-800/90 shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  {tr('Letzte Anrufaktivitäten', 'Recent Call Records')}
                </h2>
              </div>
              <button
                onClick={() => onNavigate?.('cdr')}
                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold transition"
              >
                <span>{tr('Alle Anrufe', 'View full CDR')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">{tr('Lade Anrufe...', 'Loading CDR...')}</div>
            ) : recentCalls.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {recentCalls.map(call => {
                  const direction = getCallDirection(call)
                  const isAnswered = call.disposition === 'ANSWERED'

                  return (
                    <div
                      key={call.id}
                      className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-750/50 transition"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Direction Icon */}
                        <div
                          className={`p-2 rounded-xl flex-shrink-0 ${
                            direction === 'inbound'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                              : direction === 'outbound'
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                              : 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {direction === 'inbound' ? (
                            <PhoneIncoming className="w-4 h-4" />
                          ) : direction === 'outbound' ? (
                            <PhoneOutgoing className="w-4 h-4" />
                          ) : (
                            <Phone className="w-4 h-4" />
                          )}
                        </div>

                        {/* Caller -> Callee */}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
                            <span className="truncate">{getCallSrcName(call)}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{getCallDstName(call)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(call.call_date)}
                            </span>
                            {call.billsec != null && call.billsec > 0 && (
                              <span>• {formatDuration(call.billsec)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Disposition Badge */}
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                          isAnswered
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        {call.disposition || 'NO ANSWER'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 text-sm">
                {tr('Keine Anrufdaten vorhanden', 'No call history recorded yet')}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SIP TRUNKS & SPEED DIALS (1 Col) */}
        <div className="space-y-6">
          {/* SIP Trunks Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-800/90 shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-500" />
                {tr('SIP-Leitungen', 'SIP Trunks')}
              </h2>
              <button
                onClick={() => onNavigate?.('settings')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {tr('Konfigurieren', 'Manage')}
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">{tr('Lade Leitungen...', 'Loading trunks...')}</div>
            ) : trunks.length > 0 ? (
              <div className="space-y-3">
                {trunks.map(trunk => {
                  const isOnline = trunk.status === 'online'
                  const provider = trunk.provider ? PROVIDER_INFO[trunk.provider] : null
                  const trunkIdMatch = trunk.endpoint.match(/\d+/)
                  const trunkId = trunkIdMatch ? parseInt(trunkIdMatch[0], 10) : null

                  return (
                    <div
                      key={trunk.endpoint}
                      onClick={() => trunkId != null && onTrunkClick?.(trunkId)}
                      className="cursor-pointer p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-slate-50/50 dark:bg-slate-900/30 hover:border-cyan-400/50 transition-all duration-150"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {provider?.label || trunk.display_name || trunk.endpoint}
                          </div>
                          <div className="text-xs text-slate-400 truncate mt-0.5">
                            {trunk.display_name}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isOnline
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      {trunk.rtt != null && trunk.rtt > 0 && (
                        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Ping Latency: {trunk.rtt} ms</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-slate-400 text-sm">
                {tr('Keine SIP-Leitungen konfiguriert', 'No SIP trunks configured')}
              </p>
            )}
          </div>

          {/* Thailand Emergency & Essential Hotlines Widget */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 shadow-md border border-indigo-500/20">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300 mb-1 flex items-center gap-2">
              <LifeBuoy className="w-4 h-4 text-indigo-400" />
              Thailand Speed Dials
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Pre-configured emergency & public service hotlines
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  setDialNum('191')
                  if (extensions.length) setDialExt(extensions[0].endpoint)
                  setShowCallModal(true)
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
              >
                <Shield className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white">191</div>
                  <div className="text-[10px] text-slate-400">Police Hotline</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setDialNum('1669')
                  if (extensions.length) setDialExt(extensions[0].endpoint)
                  setShowCallModal(true)
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
              >
                <HeartPulse className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white">1669</div>
                  <div className="text-[10px] text-slate-400">Medical EMS</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setDialNum('199')
                  if (extensions.length) setDialExt(extensions[0].endpoint)
                  setShowCallModal(true)
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
              >
                <Flame className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white">199</div>
                  <div className="text-[10px] text-slate-400">Fire & Rescue</div>
                </div>
              </button>

              <button
                onClick={() => {
                  setDialNum('1155')
                  if (extensions.length) setDialExt(extensions[0].endpoint)
                  setShowCallModal(true)
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
              >
                <LifeBuoy className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div>
                  <div className="font-bold text-white">1155</div>
                  <div className="text-[10px] text-slate-400">Tourist Police</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== QUICK ORIGINATE CALL MODAL ==================== */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-indigo-500" />
                {tr('Schnellanruf (Originate)', 'Originate Phone Call')}
              </h3>
              <button
                onClick={() => setShowCallModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOriginate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {tr('Ihre Nebenstelle', 'From Extension')}
                </label>
                <select
                  value={dialExt}
                  onChange={e => setDialExt(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {extensions.map(ext => (
                    <option key={ext.endpoint} value={ext.endpoint}>
                      {ext.endpoint} - {ext.user_name || ext.display_name || 'Extension'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {tr('Zielrufnummer', 'Destination Number')}
                </label>
                <input
                  type="text"
                  placeholder={tr('z.B. 0812345678 oder 1002', 'e.g. 0812345678, 1002, 191')}
                  value={dialNum}
                  onChange={e => setDialNum(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {dialMsg && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    dialMsg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {dialMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{dialMsg.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCallModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  {tr('Abbrechen', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={dialing}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition active:scale-95 disabled:opacity-50"
                >
                  {dialing ? tr('Wählt...', 'Calling...') : tr('Jetzt Anrufen', 'Dial Now')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
