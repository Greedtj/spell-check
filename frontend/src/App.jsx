import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { 
  BookOpen, Download, FileSpreadsheet, FileText, History, LibraryBig, LogOut,
  Plus, Search, Upload, Users, CheckCircle2, Info, Check, ChevronRight,
  ChevronLeft, ChevronDown, Home, Timer, AlertCircle, Clock3, Eye, Trash2, Pencil, Menu, MoreHorizontal, Sparkles
} from 'lucide-react'
import './styles.css'

const configuredApi = import.meta.env.VITE_API_URL
const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const API = configuredApi && !(configuredApi.includes('localhost') && !isLocalHost)
  ? configuredApi
  : isLocalHost ? 'http://localhost:8000' : window.location.origin
const MOCK = import.meta.env.VITE_MOCK === '1'
const PAGE_SIZE = 5
const TEXT_HISTORY_KEY = 'spell-check-beta-text-history'
const TEXT_HISTORY_TTL = 24 * 60 * 60 * 1000
const cell = 'px-5 py-4 text-left align-middle text-sm text-[var(--muted)]'
const actionButton = 'focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-2)] shadow-sm'

function textCheckHistory() {
  try {
    const history = JSON.parse(localStorage.getItem(TEXT_HISTORY_KEY) || '[]')
    return Array.isArray(history) ? history.filter(item => Date.now() - item.checkedAt < TEXT_HISTORY_TTL).slice(0, 3) : []
  } catch {
    return []
  }
}

function saveTextCheckHistory(history) {
  try {
    localStorage.setItem(TEXT_HISTORY_KEY, JSON.stringify(history))
  } catch {}
}

async function request(path, options = {}) {
  if (MOCK) return mockRequest(path, options)
  const res = await fetch(`${API}${path}`, { credentials: 'include', ...options })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function mockRequest(path, options = {}) {
  const mockMe = { email: 'admin@example.test', name: 'ผู้ดูแลระบบ ทดสอบ', type: 'TEACHER', is_admin: true }
  const mockJobs = [
    { id: '1', original_filename: 'หลักสูตรวิศวกรรมคอมพิวเตอร์.pdf', status: 'PROCESSING', error_text: null, pages: 46, elapsed_seconds: 83, finding_count: 0, created_at: new Date('2025-06-19T14:32:00').toISOString(), updated_at: new Date().toISOString(), user_email: mockMe.email },
    { id: '2', original_filename: 'หลักสูตรบริหารธุรกิจบัณฑิต.pdf', status: 'DONE', error_text: null, pages: 31, elapsed_seconds: 135, finding_count: 24, created_at: new Date('2025-06-19T13:11:00').toISOString(), updated_at: new Date().toISOString(), user_email: 'teacher1@example.test' },
    { id: '3', original_filename: 'รายงานผลการดำเนินงานปี 2567.pdf', status: 'DONE', error_text: null, pages: 18, elapsed_seconds: 108, finding_count: 15, created_at: new Date('2025-06-19T11:05:00').toISOString(), updated_at: new Date().toISOString(), user_email: 'teacher2@example.test' },
    { id: '4', original_filename: 'คู่มือการปฏิบัติงาน.pdf', status: 'DONE', error_text: null, pages: 22, elapsed_seconds: 95, finding_count: 9, created_at: new Date('2025-06-18T16:45:00').toISOString(), updated_at: new Date().toISOString(), user_email: 'admin@example.test' },
    { id: '5', original_filename: 'แผนกลยุทธ์มหาวิทยาลัย 2568-2572.pdf', status: 'FAILED', error_text: 'ไฟล์ PDF บางหน้าเสียหาย กรุณาอัปโหลดใหม่', pages: 12, elapsed_seconds: null, finding_count: 0, created_at: new Date('2025-06-18T10:20:00').toISOString(), updated_at: new Date().toISOString(), user_email: 'staff1@example.test' },
    { id: '6', original_filename: 'เอกสารประกอบการสอน_บทที่1-5.pdf', status: 'DONE', error_text: null, pages: 30, elapsed_seconds: 153, finding_count: 18, created_at: new Date('2025-06-17T15:33:00').toISOString(), updated_at: new Date().toISOString(), user_email: 'teacher3@example.test' }
  ]
  const mockFindings = [
    { id: 1, page: '3', found: 'บุคคลากร', suggestion: 'บุคลากร', reason: 'dictionary' },
    { id: 2, page: '8', found: 'คลอบคลุม', suggestion: 'ครอบคลุม', reason: 'สะกดผิดตามพจนานุกรม' },
    { id: 3, page: '12', found: 'อนุญาติ', suggestion: 'อนุญาต', reason: 'ใช้รูปคำมาตรฐาน' }
  ]
  if (path === '/api/me') return mockMe
  if (path === '/api/jobs') return mockJobs
  if (options.method === 'POST' && path === '/api/text-check') return mockFindings.map(item => ({ ...item, page: 'ข้อความ' }))
  if (path.match(/^\/api\/jobs\/[^/]+\/findings$/)) return mockFindings
  if (options.method === 'DELETE' && path.match(/^\/api\/jobs\/[^/]+$/)) return { ok: true }
  if (path === '/api/admin/dictionary') {
    if (!window.__mockDict) {
      window.__mockDict = [
        { id: 1, wrong: 'บุคคลากร', correct: 'บุคลากร' }, 
        { id: 2, wrong: 'คลอบคลุม', correct: 'ครอบคลุม' },
        { id: 3, wrong: 'อนุญาติ', correct: 'อนุญาต' },
        { id: 4, wrong: 'สัมนา', correct: 'สัมมนา' },
        { id: 5, wrong: 'โน๊ต', correct: 'โน้ต' }
      ]
    }
    return window.__mockDict
  }
  if (options.method === 'POST' && path === '/api/admin/dictionary') {
    const body = JSON.parse(options.body)
    const newItem = { id: Date.now(), wrong: body.wrong, correct: body.correct }
    window.__mockDict = [...(window.__mockDict || []), newItem]
    return newItem
  }
  if (options.method === 'PATCH' && path.match(/^\/api\/admin\/dictionary\/\d+$/)) {
    const id = parseInt(path.split('/').pop())
    const body = JSON.parse(options.body)
    window.__mockDict = (window.__mockDict || []).map(item => 
      item.id === id ? { ...item, wrong: body.wrong, correct: body.correct } : item
    )
    return { id, wrong: body.wrong, correct: body.correct }
  }
  if (options.method === 'DELETE' && path.match(/^\/api\/admin\/dictionary\/\d+$/)) {
    const id = parseInt(path.split('/').pop())
    window.__mockDict = (window.__mockDict || []).filter(item => item.id !== id)
    return { ok: true }
  }

  if (path === '/api/admin/users') {
    if (!window.__mockUsers) {
      window.__mockUsers = [
        { id: 1, email: mockMe.email, name: mockMe.name, type: 'TEACHER', is_admin: true, is_blocked: false },
        { id: 2, email: 'student@example.test', name: 'นักศึกษา ทดสอบ', type: 'STUDENT', is_admin: false, is_blocked: false },
        { id: 3, email: 'teacher2@example.test', name: 'อาจารย์ ทดสอบ', type: 'TEACHER', is_admin: false, is_blocked: false },
        { id: 4, email: 'blocked@example.test', name: 'ผู้ใช้ ถูกระงับ', type: 'STUDENT', is_admin: false, is_blocked: true }
      ]
    }
    return window.__mockUsers
  }
  if (options.method === 'PATCH' && path.match(/^\/api\/admin\/users\/\d+$/)) {
    const id = parseInt(path.split('/').pop())
    const body = JSON.parse(options.body)
    window.__mockUsers = (window.__mockUsers || []).map(u => 
      u.id === id ? { ...u, ...body } : u
    )
    return window.__mockUsers.find(u => u.id === id)
  }

  if (path === '/api/admin/finding-stats') return [
    { found: 'บุคคลากร', suggestion: 'บุคลากร', count: 18 },
    { found: 'คลอบคลุม', suggestion: 'ครอบคลุม', count: 7 },
    { found: 'อนุญาติ', suggestion: 'อนุญาต', count: 6 },
    { found: 'สัมนา', suggestion: 'สัมมนา', count: 4 }
  ]
  if (path.includes('/download/')) return { url: '#' }
  return {}
}

function fileExtLabel(filename) {
  return filename?.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF'
}

function formatDuration(seconds) {
  if (!seconds) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function apiDate(dateStr) {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(dateStr) ? dateStr : `${dateStr}Z`)
}

function formatThaiDate(dateStr) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(apiDate(dateStr))
}

function formatFindings(job) {
  if (job.status === 'PROCESSING' || job.status === 'FAILED') return '-'
  return job.finding_count || 0
}

function getStatusBadge(status) {
  if (status === 'PENDING') {
    return <span className="text-center inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 select-none">รอคิว</span>
  }
  if (status === 'PROCESSING') {
    return <span className="text-center inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--warning-bg)] text-[var(--warning)] select-none">กำลังตรวจ</span>
  }
  if (status === 'DONE') {
    return <span className="text-center inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--success-bg)] text-[var(--success)] select-none">เสร็จสิ้น</span>
  }
  if (status === 'FAILED') {
    return <span className="text-center inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--error-bg)] text-[var(--error)] select-none">เกิดข้อผิดพลาด</span>
  }
  return <span className="text-center inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 select-none">{status}</span>
}

function App() {
  const [me, setMe] = useState(null)
  const [jobs, setJobs] = useState([])
  const [view, setView] = useState('dashboard')
  const [selectedJob, setSelectedJob] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  
  // Custom alerts and modals
  const [alert, setAlert] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function load() {
    try {
      const [meData, jobData] = await Promise.all([request('/api/me'), request('/api/jobs')])
      setMe(meData)
      setJobs(jobData)
      setError('')
    } catch {
      setMe(null)
    }
  }

  useEffect(() => { load() }, [])
  
  useEffect(() => {
    if (MOCK) return
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (alert) {
      const t = setTimeout(() => setAlert(null), 4000)
      return () => clearTimeout(t)
    }
  }, [alert])

  const filtered = useMemo(() => jobs.filter(j => j.original_filename.toLowerCase().includes(query.toLowerCase())), [jobs, query])
  
  if (!me) return <Login />

  async function deleteJob(job) {
    setConfirm({
      message: `คุณต้องการลบรายการการตรวจสอบเอกสาร "${job.original_filename}" ออกจากระบบใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: async () => {
        try {
          await request(`/api/jobs/${job.id}`, { method: 'DELETE' })
          setAlert({ type: 'success', message: 'ลบเอกสารออกจากระบบเรียบร้อยแล้ว' })
          setJobs(items => items.filter(item => item.id !== job.id))
          if (selectedJob?.id === job.id) {
            setSelectedJob(null)
            setView('history')
          }
          setError('')
        } catch (err) {
          setAlert({ type: 'error', message: err.message })
        }
      }
    })
  }

  function showFindings(job) {
    setSelectedJob(job)
    setView('findings')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-[var(--text)] font-app">
      {/* Toast Alert */}
      {alert && (
        <div className={`fixed right-4 top-4 z-[999] flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-xl animate-slide-up text-sm font-semibold ${
          alert.type === 'success' 
            ? 'border-green-200 bg-[var(--success-bg)] text-[#2e7d32]' 
            : 'border-red-200 bg-[var(--error-bg)] text-[var(--error)]'
        }`}>
          {alert.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{alert.message}</span>
          <button onClick={() => setAlert(null)} className="ml-2 text-current opacity-70 hover:opacity-100 text-lg leading-none font-bold">×</button>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirm && (
        <div className="fixed inset-0 z-[990] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="card max-w-[420px] w-full p-6 bg-white space-y-4 shadow-2xl animate-slide-up border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="text-yellow-500 w-5 h-5 shrink-0" />
              <span>ยืนยันการดำเนินการ</span>
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">{confirm.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setConfirm(null)} 
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
              >
                ยกเลิก
              </button>
              <button 
                onClick={() => { confirm.onConfirm(); setConfirm(null); }} 
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sidebar */}
      <Sidebar view={view} setView={setView} me={me} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <section className="flex-1 flex min-w-0 flex-col overflow-hidden bg-[var(--bg)]">
        <Topbar view={view} me={me} setSidebarOpen={setSidebarOpen} />
        {error && <p className="mx-6 mt-4 rounded-xl border border-[var(--error)] bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)] font-semibold">{error}</p>}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {view === 'dashboard' && <Dashboard jobs={jobs} setView={setView} me={me} setError={setError} onFindings={showFindings} />}
          {view === 'document-check' && <DocumentCheck reload={load} setError={setError} setAlert={setAlert} onFindings={showFindings} />}
          {view === 'history' && <HistoryView jobs={filtered} query={query} setQuery={setQuery} setError={setError} onDelete={deleteJob} onFindings={showFindings} />}
          {view === 'findings' && <FindingsView job={selectedJob} setView={setView} setError={setError} />}
          {me.is_admin && view === 'admin' && <Admin setAlert={setAlert} setConfirm={setConfirm} />}
        </div>
      </section>
    </div>
  )
}

function Login() {
  const loginFailed = new URLSearchParams(window.location.search).get('login') === 'failed'
  return (
    <main className="login-page grid place-items-center bg-[#f8fafc] relative overflow-hidden font-app">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--primary-light)] filter blur-[120px] opacity-70 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[var(--accent-light)] filter blur-[120px] opacity-70 pointer-events-none" />
      
      <section className="card login-card w-full max-w-[460px] p-6 sm:p-10 bg-white relative z-10 animate-slide-up flex flex-col items-center text-center">
        <div className="mb-4">
          <BookOpen className="w-16 h-16 text-[#2e7d32]" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Spell Check</h1>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">ระบบตรวจสอบคำผิดเอกสาร</p>
        
        <div className="w-full my-6 sm:my-8 h-[1px] bg-gray-100" />
        
        <div className="space-y-4 w-full">
          <p className="text-sm font-semibold text-gray-600">เข้าใช้งานระบบผ่านบัญชีมหาวิทยาลัยพะเยา</p>
          
          <a 
            className="login-button focus-ring flex w-full items-center justify-center gap-3 border border-gray-200 bg-white px-4 py-3 min-h-[52px] text-xs sm:text-sm font-bold text-gray-700 transition hover:bg-gray-50 hover:border-gray-300 shadow-sm leading-snug"
            href={MOCK ? '#' : `${API}/auth/login`}
            onClick={() => {
              if (MOCK) {
                window.location.reload()
              }
            }}
          >
            <span className="w-4 text-center text-base leading-none text-[#4285f4]">G</span>
            <span>ลงชื่อเข้าใช้งานด้วย Google</span>
          </a>
          
          {loginFailed && (
            <div className="rounded-xl border border-red-200 bg-[var(--error-bg)] px-4 py-3 text-xs font-semibold text-[var(--error)] animate-pulse">
              เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบสิทธิ์การใช้งาน
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-10 text-[11px] text-gray-400 font-medium">
          มหาวิทยาลัยพะเยา · University of Phayao
        </div>
      </section>
    </main>
  )
}

function Sidebar({ view, setView, me, sidebarOpen, setSidebarOpen }) {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-screen w-72 shrink-0 flex-col justify-between border-r border-[#ececec] bg-white p-6">
        <SidebarContent view={view} setView={setView} me={me} />
      </aside>

      {/* Mobile Sidebar Drawer Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-[#ececec] flex flex-col justify-between p-6 transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent view={view} setView={setView} me={me} onClose={() => setSidebarOpen(false)} />
      </aside>
    </>
  )
}

function SidebarContent({ view, setView, me, onClose }) {
  const mainMenuItems = [
    { id: 'dashboard', icon: Home, label: 'แดชบอร์ด' },
    { id: 'document-check', icon: Upload, label: 'ตรวจเอกสาร' },
    { id: 'history', icon: History, label: 'ประวัติการตรวจสอบ' }
  ]

  const adminMenuItems = [
    { id: 'admin', icon: Users, label: 'จัดการผู้ใช้งาน' },
  ]

  const handleNav = (id) => {
    setView(id)
    if (onClose) onClose()
  }

  return (
    <div className="flex flex-col h-full justify-between font-app">
      <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
        {/* Logo Section */}
        <div className="flex items-center gap-3 pb-6 mb-6 border-b border-gray-100">
          <BookOpen className="w-8 h-8 text-[#2e7d32] shrink-0" />
          <div>
            <div className="text-lg font-bold text-gray-900 leading-tight">Spell Check</div>
            <div className="text-xs text-gray-400 font-medium">ระบบตรวจสอบคำผิดเอกสาร</div>
          </div>
        </div>

        {/* เมนูหลัก */}
        <div className="space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">เมนูหลัก</p>
            <nav className="space-y-1">
              {mainMenuItems.map(item => {
                const active = view === item.id || (item.id === 'history' && view === 'findings')
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                      active 
                        ? 'bg-[#eefcf2] text-[#2e7d32]' 
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-[#2e7d32]' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* สำหรับผู้ดูแลระบบ */}
          {me.is_admin && (
            <div>
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">สำหรับผู้ดูแลระบบ</p>
              <nav className="space-y-1">
                {adminMenuItems.map(item => {
                  const active = view === item.id
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                        active 
                          ? 'bg-[#eefcf2] text-[#2e7d32]' 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${active ? 'text-[#2e7d32]' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 text-center border-t border-gray-100 font-app">
        <span className="text-[11px] text-gray-400 font-semibold tracking-wider">Spell Check v1.0.0 beta</span>
      </div>
    </div>
  )
}

function Topbar({ view, me, setSidebarOpen }) {
  const titleMap = {
    dashboard: 'แดชบอร์ด',
    'document-check': 'ตรวจเอกสาร',
    history: 'ประวัติการตรวจสอบ',
    findings: 'รายการคำผิด',
    dictionary: 'คลังคำศัพท์ (Dictionary)',
    logs: 'บันทึกการทำงาน (Logs)',
    admin: 'จัดการผู้ใช้งาน',
    stats: 'สถิติคำผิด'
  }

  const displayTitle = titleMap[view] || 'แดชบอร์ด'

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#ececec] bg-white px-6 glass-header sticky top-0 z-30 font-app">
      <div className="flex items-center gap-3">
        {/* Hamburger Menu Button */}
        <button 
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition mr-1"
          aria-label="เปิดเมนู"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">{displayTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Profile Card */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-[16px] text-center text-base leading-none text-[#4285f4]">G</span>

          {/* User Details */}
          <div className="text-left select-none min-w-0 max-w-[85px] sm:max-w-none">
            <div className="text-sm font-bold text-gray-700 leading-tight truncate" title={me.name || me.email}>{me.name || me.email}</div>
            <div className="text-[11px] text-gray-400 font-medium hidden sm:block truncate" title={me.email}>{me.email}</div>
          </div>
        </div>
        
        <div className="h-6 w-[1px] bg-gray-200" />
        
        <a 
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-red-500" 
          href={`${API}/auth/logout`} 
          title="ออกจากระบบ"
        >
          <LogOut size={18} />
        </a>
      </div>
    </header>
  )
}

function KpiCard({ label, value, subtext, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="border border-[var(--border)] rounded-2xl p-5 bg-white flex items-center justify-between shadow-sm font-app">
      <div className="space-y-1">
        <span className="text-xs font-bold text-gray-400 block tracking-wide uppercase">{label}</span>
        <strong className="text-2xl font-bold text-gray-900 block leading-tight tracking-tight">{value}</strong>
        <span className="text-[11px] text-gray-400 font-semibold block">{subtext}</span>
      </div>
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconBg} shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
    </div>
  )
}

function Dashboard({ jobs, setView, me, setError, onFindings }) {
  const [page, setPage] = useState(1)

  const totalJobsCount = MOCK ? 128 : jobs.length
  const processingCount = MOCK ? 3 : jobs.filter(j => j.status === 'PROCESSING').length
  const doneCount = MOCK ? 112 : jobs.filter(j => j.status === 'DONE').length
  const findingsCount = MOCK ? 1245 : jobs.reduce((sum, job) => sum + (job.finding_count || 0), 0)
  
  const doneJobs = jobs.filter(j => j.status === 'DONE' && j.elapsed_seconds)
  const avgSec = doneJobs.length ? Math.round(doneJobs.reduce((sum, j) => sum + j.elapsed_seconds, 0) / doneJobs.length) : 0
  const averageTime = MOCK 
    ? '2 นาที 48 วินาที' 
    : avgSec 
      ? `${Math.floor(avgSec / 60)} นาที ${avgSec % 60} วินาที` 
      : '-'
  
  const currentPage = Math.min(page, Math.max(1, Math.ceil(jobs.length / PAGE_SIZE)))
  const visibleJobs = jobs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-auto p-6 space-y-6 font-app">
      {/* Welcome Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">แดชบอร์ด</h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">ยินดีต้อนรับ, {me.name || me.email} 👋</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1d55b6] px-4 text-sm font-semibold text-white transition hover:bg-[#174496] shadow-sm" onClick={() => setView('document-check')}>
            <Upload size={16} />
            <span>ตรวจเอกสาร</span>
          </button>
          {/* Connection status badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-green-200 bg-[#eefcf2] text-xs font-semibold text-[#2e7d32] select-none">
            <CheckCircle2 size={14} className="text-[#2e7d32]" />
            <span>เชื่อมต่อ Google Account แล้ว</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-5">
        <div className="col-span-1 xl:col-span-2">
          <KpiCard
            label="งานทั้งหมด"
            value={totalJobsCount}
            subtext="ไฟล์ที่อัปโหลดทั้งหมด"
            icon={FileText}
            iconBg="bg-blue-50"
            iconColor="text-[#1d55b6]"
          />
        </div>
        <div className="col-span-1 xl:col-span-2">
          <KpiCard
            label="กำลังดำเนินการ"
            value={processingCount}
            subtext="กำลังตรวจสอบ"
            icon={Clock3}
            iconBg="bg-[#fff3e6]"
            iconColor="text-[#f58220]"
          />
        </div>
        <div className="col-span-1 xl:col-span-2">
          <KpiCard
            label="ตรวจสอบเสร็จสิ้น"
            value={doneCount}
            subtext="เสร็จสมบูรณ์"
            icon={CheckCircle2}
            iconBg="bg-[#eefcf2]"
            iconColor="text-[#48a83c]"
          />
        </div>
        <div className="col-span-1 xl:col-span-3">
          <KpiCard
            label="พบคำผิดทั้งหมด"
            value={findingsCount.toLocaleString()}
            subtext="รายการ"
            icon={AlertCircle}
            iconBg="bg-[#ffe9e7]"
            iconColor="text-[#ff6b62]"
          />
        </div>
        <div className="col-span-1 sm:col-span-2 xl:col-span-3">
          <KpiCard
            label="เวลาเฉลี่ยต่อไฟล์"
            value={averageTime}
            subtext="(เฉลี่ย)"
            icon={Timer}
            iconBg="bg-[#f3ebff]"
            iconColor="text-[#a855f7]"
          />
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="border border-[var(--border)] rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-gray-900">งานล่าสุด</h3>
            <p className="text-xs text-gray-400 font-medium mt-0.5">รีเฟรชอัตโนมัติทุก 5 วินาที</p>
          </div>
          
          <button className="flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm" onClick={() => setView('history')}>
            <span>ดูประวัติทั้งหมด</span>
            <ChevronRight size={14} />
          </button>
        </div>

        <JobTable jobs={visibleJobs} setError={setError} onDelete={null} onFindings={onFindings} />
        
        <Pagination page={currentPage} setPage={setPage} total={jobs.length} />
      </div>

      {/* Tips Banner */}
      <div className="flex gap-3 bg-[#eef6ff] border border-blue-100 rounded-2xl p-4 text-sm text-[#1d55b6] items-start">
        <Info className="w-5 h-5 shrink-0 mt-0.5 text-[#1d55b6]" />
        <div>
          <strong className="block font-bold">เคล็ดลับการใช้งาน</strong>
          <span className="block mt-0.5 text-xs text-blue-700 font-semibold leading-relaxed">
            ระบบจะตรวจสอบคำผิดอัตโนมัติหลังจากอัปโหลดไฟล์ PDF หรือ DOCX เจ้าหน้าที่และอาจารย์สามารถดูรายการคำผิดและดาวน์โหลดรายงานฉบับสมบูรณ์ (Original/Excel) เมื่อประมวลผลเสร็จสิ้น
          </span>
        </div>
      </div>
    </main>
  )
}

function DocumentCheck({ reload, setError, setAlert, onFindings }) {
  const [mode, setMode] = useState('upload') // 'upload' | 'text'

  // --- Upload mode state/logic ---
  const uploadRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeJob, setActiveJob] = useState(null)
  const [lastFile, setLastFile] = useState(null)

  async function submitFile(file) {
    if (!file) return
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (ext !== '.pdf' && ext !== '.docx') {
      setAlert({ type: 'error', message: 'กรุณาอัปโหลดไฟล์ PDF หรือ DOCX เท่านั้น' })
      return
    }
    const form = new FormData()
    form.append('file', file)
    setUploading(true)
    try {
      const job = await request('/api/jobs', { method: 'POST', body: form })
      setLastFile(file)
      setActiveJob(job)
      await reload()
    } catch (err) {
      setError(err.message)
      setAlert({ type: 'error', message: err.message })
    } finally {
      setUploading(false)
    }
  }

  async function upload(e) {
    const file = e.target.files?.[0]
    await submitFile(file)
    e.target.value = ''
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    await submitFile(e.dataTransfer?.files?.[0])
  }

  // Poll the job's own status endpoint while it's still queued/running.
  useEffect(() => {
    if (!activeJob || (activeJob.status !== 'PENDING' && activeJob.status !== 'PROCESSING')) return
    const id = setInterval(async () => {
      try {
        const job = await request(`/api/jobs/${activeJob.id}`)
        setActiveJob(job)
        if (job.status === 'DONE' || job.status === 'FAILED') {
          reload()
        }
      } catch {
        // job may have been removed elsewhere; stop polling silently
      }
    }, 3000)
    return () => clearInterval(id)
  }, [activeJob?.id, activeJob?.status])

  // Fetch a small findings preview once a job completes (reuses the existing
  // findings endpoint; no AI call, no new backend work).
  const [previewFindings, setPreviewFindings] = useState([])
  const [previewLoaded, setPreviewLoaded] = useState(false)

  useEffect(() => {
    if (!activeJob || activeJob.status !== 'DONE') {
      setPreviewFindings([])
      setPreviewLoaded(false)
      return
    }
    if (!activeJob.finding_count) {
      setPreviewFindings([])
      setPreviewLoaded(true)
      return
    }
    let cancelled = false
    setPreviewLoaded(false)
    request(`/api/jobs/${activeJob.id}/findings`)
      .then(data => { if (!cancelled) { setPreviewFindings(data); setPreviewLoaded(true) } })
      .catch(() => { if (!cancelled) setPreviewLoaded(true) })
    return () => { cancelled = true }
  }, [activeJob?.id, activeJob?.status])

  function resetUpload() {
    setActiveJob(null)
    setLastFile(null)
  }

  function retryUpload() {
    if (lastFile) submitFile(lastFile)
  }

  // --- Text mode state/logic (unchanged behavior, merged from ตรวจข้อความ) ---
  const [text, setText] = useState('')
  const [findings, setFindings] = useState([])
  const [history, setHistory] = useState(textCheckHistory)
  const [checking, setChecking] = useState(false)
  const [hasChecked, setHasChecked] = useState(false)
  const overLimit = text.length > 500

  async function checkText() {
    const value = text.trim()
    if (!value) return setError('กรุณาใส่ข้อความที่ต้องการตรวจ')
    if (overLimit) return setError('ข้อความยาวเกิน 500 ตัวอักษร')
    setChecking(true)
    setError('')
    try {
      const nextFindings = await request('/api/text-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: value }),
      })
      setFindings(nextFindings)
      const nextHistory = [{ text: value, findings: nextFindings, checkedAt: Date.now() }, ...history.filter(item => item.text !== value)].slice(0, 3)
      setHistory(nextHistory)
      saveTextCheckHistory(nextHistory)
      setHasChecked(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  const tabButton = (id, label) => (
    <button
      onClick={() => setMode(id)}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-bold transition ${
        mode === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  )

  return (
    <main className="min-h-[calc(100vh-80px)] overflow-auto p-6 font-app">
      <div className="mx-auto w-full max-w-[600px] pt-8 sm:pt-14 space-y-6">
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">ตรวจเอกสาร</h2>
          <p className="text-sm text-gray-500 font-medium">
            {mode === 'upload' ? 'อัปโหลดไฟล์เพื่อตรวจคำผิดอัตโนมัติ' : 'วางข้อความเพื่อตรวจคำผิดทันที'}
          </p>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          {tabButton('upload', 'อัปโหลดเอกสาร')}
          {tabButton('text', 'วางข้อความ')}
        </div>

        {mode === 'upload' && !activeJob && (
          <div className="space-y-3">
            {/* Upload dropzone: file type is detected automatically */}
            <div
              onClick={() => !uploading && uploadRef.current?.click()}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[290px] ${
                uploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              } ${
                dragActive
                  ? 'scale-[1.02] border-[var(--primary)] bg-[var(--primary-light)]'
                  : 'border-blue-200 bg-[#f8faff] hover:bg-blue-50/50'
              }`}
            >
              <input ref={uploadRef} type="file" accept=".pdf,.docx" onChange={upload} hidden disabled={uploading} />

              <div className="upload-icon-hover w-14 h-14 rounded-full bg-[#1d55b6] flex items-center justify-center mb-4 shadow-sm shadow-blue-200">
                <Upload size={22} className="text-white" />
              </div>

              <h3 className="text-base font-bold text-gray-900">
                {dragActive ? 'วางไฟล์เพื่อตรวจสอบ' : uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดไฟล์เอกสาร'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 font-semibold">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
              <p className="text-[11px] text-gray-400 mt-0.5 font-medium">ขนาดไม่เกิน 200 MB</p>

              <button className="mt-5 px-6 py-2.5 bg-[#1d55b6] hover:bg-[#174496] text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-60" disabled={uploading}>
                เลือกไฟล์
              </button>
            </div>

            <p className="text-xs text-gray-400 font-medium text-center">ดูผลลัพธ์ได้ที่ประวัติการตรวจสอบ</p>
          </div>
        )}

        {mode === 'upload' && activeJob && (activeJob.status === 'PENDING' || activeJob.status === 'PROCESSING') && (
          <div className="animate-fade-in flex flex-col items-center text-center py-8 space-y-6">
            {/* Document illustration: larger, scanning, gently pulsing lines, AI glow badge */}
            <div className="relative w-28 h-36 rounded-xl border border-blue-100 bg-white overflow-hidden shadow-md">
              <div className="p-4 space-y-2.5">
                {['w-4/5', 'w-full', 'w-3/5', 'w-full', 'w-2/3', 'w-full', 'w-1/2'].map((w, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full bg-blue-100 line-pulse ${w}`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <div className="scan-line pointer-events-none absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-[#1d55b6]/25 to-transparent" />
              <div className="ai-glow absolute -top-2.5 -right-2.5 w-9 h-9 rounded-full bg-white border border-blue-100 shadow flex items-center justify-center">
                <Sparkles size={16} className="text-[#1d55b6]" />
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900 truncate max-w-[280px]" title={activeJob.original_filename}>{activeJob.original_filename}</h3>
              <p className="text-sm text-gray-500 mt-1 font-semibold">กำลังตรวจสอบเอกสาร...</p>
            </div>
            <p className="text-xs text-gray-400 font-medium max-w-[320px]">ออกจากหน้านี้ได้ ระบบจะประมวลผลต่อในเบื้องหลัง ดูผลได้ที่ประวัติการตรวจสอบ</p>
          </div>
        )}

        {mode === 'upload' && activeJob && activeJob.status === 'DONE' && (
          <div className="animate-fade-in flex flex-col items-center text-center py-10 space-y-5">
            <div className="animate-check-pop w-14 h-14 rounded-full bg-[#eefcf2] flex items-center justify-center">
              <CheckCircle2 size={26} className="text-[#2e7d32]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 truncate max-w-[280px]" title={activeJob.original_filename}>{activeJob.original_filename}</h3>
              <p className="text-sm text-gray-600 mt-1 font-semibold">
                พบคำผิด {activeJob.finding_count || 0} รายการ
                {activeJob.elapsed_seconds ? ` · ใช้เวลา ${formatDuration(activeJob.elapsed_seconds)}` : ''}
              </p>
            </div>

            {previewLoaded && (
              previewFindings.length > 0 ? (
                <div className="w-full max-w-[360px] space-y-1.5 text-left">
                  {previewFindings.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-red-500 line-through truncate max-w-[140px]" title={item.found}>{item.found}</span>
                      <span className="text-gray-300 shrink-0">→</span>
                      <span className="font-semibold text-green-600 truncate max-w-[140px]" title={item.suggestion}>{item.suggestion}</span>
                    </div>
                  ))}
                  {previewFindings.length > 5 && (
                    <p className="text-xs text-gray-400 font-medium pt-1">และอีก {previewFindings.length - 5} จุด</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 font-medium">ไม่พบคำที่ควรแก้ไข</p>
              )
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button className={actionButton} onClick={() => onFindings(activeJob)}>ดูผลการตรวจ</button>
              <DownloadResultMenu job={activeJob} setError={setError} />
              <button className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-[var(--surface-2)] shadow-sm" onClick={resetUpload}>
                ตรวจเอกสารใหม่
              </button>
            </div>
          </div>
        )}

        {mode === 'upload' && activeJob && activeJob.status === 'FAILED' && (
          <div className="animate-fade-in flex flex-col items-center text-center py-10 space-y-5">
            <div className="w-14 h-14 rounded-full bg-[var(--error-bg)] flex items-center justify-center">
              <AlertCircle size={26} className="text-[var(--error)]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 truncate max-w-[280px]" title={activeJob.original_filename}>{activeJob.original_filename}</h3>
              <p className="text-sm text-[var(--error)] mt-1 font-semibold max-w-[320px]">{activeJob.error_text || 'เกิดข้อผิดพลาดระหว่างประมวลผล'}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button className={actionButton} onClick={retryUpload} disabled={!lastFile || uploading}>ลองอีกครั้ง</button>
              <button className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-[var(--surface-2)] shadow-sm" onClick={resetUpload}>
                ตรวจเอกสารใหม่
              </button>
            </div>
          </div>
        )}

        {mode === 'text' && (
          <div className="space-y-5">
            <div className="card bg-white p-5 shadow-sm">
              <label htmlFor="text-check" className="mb-2 block text-sm font-bold text-gray-700">วางหรือพิมพ์ข้อความที่ต้องการตรวจ</label>
              <textarea
                id="text-check"
                value={text}
                onChange={event => { setText(event.target.value); setHasChecked(false) }}
                maxLength={501}
                rows={7}
                placeholder="เช่น ข้อความอีเมลที่ต้องการตรวจคำผิด..."
                className="w-full resize-y rounded-xl border border-[var(--border)] bg-white p-3 text-sm font-medium leading-relaxed outline-none transition focus:border-[var(--accent)]"
                aria-describedby="text-check-count"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span id="text-check-count" className={`text-xs font-semibold ${overLimit ? 'text-[var(--error)]' : 'text-gray-400'}`}>{text.length}/500 ตัวอักษร</span>
                <button className={actionButton} onClick={checkText} disabled={checking || !text.trim() || overLimit}>
                  {checking ? 'กำลังตรวจ...' : 'ตรวจข้อความ'}
                </button>
              </div>
            </div>

            {hasChecked && (
              <div className="card overflow-hidden bg-white shadow-sm">
                <div className="divide-y divide-gray-100">
                  {findings.map(item => <div key={item.id} className="p-4 space-y-2"><div className="flex items-center gap-2 text-sm"><span className="font-bold text-red-500 line-through">{item.found}</span><span className="text-xs text-gray-400">→</span><span className="font-extrabold text-green-600">{item.suggestion}</span></div><div className="text-xs text-gray-500 font-semibold">เหตุผล: {item.reason}</div></div>)}
                  {!findings.length && <div className="p-8 text-center text-sm font-semibold text-gray-400">ไม่พบรายการคำผิด</div>}
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="card overflow-hidden bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-3 text-sm font-bold text-gray-700">ประวัติล่าสุด <span className="text-xs font-semibold text-gray-400">(เก็บ 24 ชั่วโมง)</span></div>
                <div className="divide-y divide-gray-100">
                  {history.map(item => (
                    <button key={item.checkedAt} className="w-full px-5 py-3 text-left transition hover:bg-gray-50" onClick={() => { setText(item.text); setFindings(item.findings); setHasChecked(true); setError('') }}>
                      <span className="block truncate text-sm font-semibold text-gray-700">{item.text}</span>
                      <span className="mt-1 block text-xs font-semibold text-gray-400">พบ {item.findings.length} รายการ · {new Date(item.checkedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function DownloadLink({ job, kind, setError, menu = false, onSelect }) {
  const [opening, setOpening] = useState(false)

  async function open() {
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    setOpening(true)
    try {
      const data = await request(`/api/jobs/${job.id}/download/${kind}`)
      if (tab) tab.location.replace(data.url)
      else window.location.assign(data.url)
    } catch (err) {
      tab?.close()
      setError(err.message)
    } finally {
      setOpening(false)
    }
  }
  const label = { original: 'ไฟล์ต้นฉบับ', highlighted: 'ไฟล์ไฮไลต์คำผิด', excel: 'รายงาน Excel' }[kind]
  const disabled = opening || (job.status !== 'DONE' && kind !== 'original') || (kind === 'highlighted' && !job.finding_count)
  const tone = kind === 'excel'
    ? 'border-green-200 text-[#0f713b] hover:bg-[#ecfdf5]'
    : kind === 'highlighted'
      ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
    : kind === 'original'
      ? 'border-red-200 text-[#c22f2f] hover:bg-[#fff1f1]'
      : 'border-gray-200 text-gray-600 hover:bg-[var(--surface-2)]'
      
  const icon = kind === 'excel'
    ? <FileSpreadsheet size={16} />
    : kind === 'highlighted'
      ? <CheckCircle2 size={16} />
    : <FileText size={16} />

  if (menu) {
    return (
      <button
        className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-gray-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        role="menuitem"
        title={`ดาวน์โหลด ${label}`}
        disabled={disabled}
        onClick={() => { onSelect?.(); open(); }}
      >
        <span className="text-gray-500">{icon}</span>
        <span>{label}</span>
      </button>
    )
  }

  return (
    <button 
      className={`rounded-lg border p-2 ${tone} disabled:cursor-not-allowed disabled:opacity-40 bg-white transition`} 
      title={`ดาวน์โหลด ${label}`} 
      aria-label={`ดาวน์โหลด ${label}`} 
      disabled={disabled}
      onClick={open}
    >
      {icon}
    </button>
  )
}

function HistoryView({ jobs, query, setQuery, setError, onDelete, onFindings }) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const currentPage = Math.min(page, Math.max(1, Math.ceil(jobs.length / pageSize)))
  const visibleJobs = jobs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <Page 
      title="ประวัติการตรวจสอบ" 
      action={
        <label className="flex h-11 w-full sm:w-[320px] items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 shadow-sm focus-within:border-[var(--accent)] transition">
          <Search size={18} className="text-[var(--muted)] shrink-0" />
          <input 
            className="w-full outline-none bg-transparent text-sm font-semibold" 
            value={query} 
            onChange={e => { setQuery(e.target.value); setPage(1) }} 
            placeholder="ค้นหาชื่อเอกสาร..." 
          />
        </label>
      }
    >
      <div className="space-y-4 font-app">
        <JobTable jobs={visibleJobs} setError={setError} onDelete={onDelete} onFindings={onFindings} />
        {jobs.length > 0 && (
          <Pagination page={currentPage} setPage={setPage} total={jobs.length} pageSize={pageSize} setPageSize={setPageSize} />
        )}
      </div>
    </Page>
  )
}


function FindingsView({ job, setView, setError }) {
  const [findings, setFindings] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  useEffect(() => {
    if (!job) return
    request(`/api/jobs/${job.id}/findings`).then(setFindings).catch(err => setError(err.message))
  }, [job?.id])

  if (!job) {
    return <Page title="รายการคำผิด" action={<button className={actionButton} onClick={() => setView('history')}>กลับ</button>} />
  }

  const pageCount = Math.max(1, Math.ceil(findings.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleFindings = findings.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const breadcrumbItems = [
    { label: 'ประวัติการตรวจสอบ', onClick: () => setView('history') },
    { label: `รายการคำผิด: ${job.original_filename}` }
  ]

  return (
    <Page title="รายการคำผิด" action={<button className={actionButton} onClick={() => setView('history')}>← กลับประวัติ</button>}>
      <Breadcrumb items={breadcrumbItems} />
      
      <div className="mb-4 text-sm font-bold text-gray-500 hidden sm:block truncate max-w-2xl">{job.original_filename}</div>
      
      <div className="card overflow-hidden bg-white mb-6 shadow-sm">
        {/* Desktop View */}
        <table className="w-full border-collapse hidden md:table">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3 w-24 text-center">หน้า</th>
              <th className="px-5 py-3 w-1/4">คำผิดที่พบ</th>
              <th className="px-5 py-3 w-1/4">คำแนะนำการแก้ไข</th>
              <th className="px-5 py-3">เหตุผลรายละเอียด</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleFindings.map(item => (
              <tr key={item.id} className="text-sm hover:bg-gray-50 transition">
                <td className="px-5 py-4 font-bold text-gray-700 text-center">{item.page || '-'}</td>
                <td className="px-5 py-4 font-bold text-red-500">{item.found}</td>
                <td className="px-5 py-4 font-bold text-green-600">{item.suggestion}</td>
                <td className="px-5 py-4 text-gray-500 font-semibold">{item.reason}</td>
              </tr>
            ))}
            {!findings.length && (
              <tr>
                <td className="px-5 py-8 text-center text-sm font-semibold text-gray-400" colSpan="4">ไม่พบรายการคำผิด</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile Card List View */}
        <div className="block md:hidden divide-y divide-gray-100">
          {visibleFindings.map(item => (
            <div key={item.id} className="p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs bg-slate-100 px-2.5 py-1 rounded font-bold text-gray-600">หน้า {item.page || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-red-500 line-through">{item.found}</span>
                <span className="text-xs text-gray-400">→</span>
                <span className="font-extrabold text-green-600">{item.suggestion}</span>
              </div>
              <div className="text-xs text-gray-500 font-semibold">เหตุผล: {item.reason}</div>
            </div>
          ))}
          {!findings.length && (
            <div className="p-8 text-center text-sm font-semibold text-gray-400">ไม่พบรายการคำผิด</div>
          )}
        </div>

        {findings.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination 
              page={currentPage} 
              setPage={setPage} 
              total={findings.length} 
              pageSize={pageSize} 
              setPageSize={setPageSize} 
            />
          </div>
        )}
      </div>
    </Page>
  )
}

function Pagination({ page, setPage, total, pageSize = 5, setPageSize }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, total)

  return (
    <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#ececec] pt-4 text-xs font-semibold text-[var(--muted)] font-app">
      <span className="text-xs font-semibold text-gray-400">แสดง {start} - {end} จาก {total} รายการ</span>
      <div className="flex items-center gap-2">
        <button 
          aria-label="หน้าก่อนหน้า" 
          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 bg-white" 
          disabled={page === 1} 
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="min-w-[80px] text-center text-xs font-bold text-gray-600">หน้า {page} / {pageCount}</span>
        <button 
          aria-label="หน้าถัดไป" 
          className="rounded-lg border border-gray-200 p-1.5 text-gray-500 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 bg-white" 
          disabled={page === pageCount} 
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={14} />
        </button>
      </div>
      {setPageSize ? (
        <div className="flex items-center gap-2">
          <span>แสดงต่อหน้า:</span>
          <select 
            value={pageSize} 
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} 
            className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none focus:border-[var(--accent)] font-semibold"
          >
            {[5, 10, 25, 50].map(sz => <option key={sz} value={sz}>{sz}</option>)}
          </select>
        </div>
      ) : (
        <span className="text-xs font-semibold text-gray-400">{pageSize} รายการต่อหน้า</span>
      )}
    </div>
  )
}

function DownloadResultMenu({ job, setError }) {
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [position, setPosition] = useState(null)

  function close() {
    setPosition(null)
  }

  function toggle() {
    if (position) return close()
    const rect = buttonRef.current.getBoundingClientRect()
    const above = window.innerHeight - rect.bottom < 220
    setPosition({
      right: Math.max(12, window.innerWidth - rect.right),
      ...(above ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
    })
  }

  useEffect(() => {
    if (!position) return
    menuRef.current?.querySelector('button:not(:disabled)')?.focus()
    const outside = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) close()
    }
    const escape = (event) => {
      if (event.key === 'Escape') {
        close()
        buttonRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [position])

  return (
    <>
      <button
        ref={buttonRef}
        className={actionButton}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={toggle}
      >
        <Download size={16} />
        <span>ดาวน์โหลดผลลัพธ์</span>
      </button>
      {position && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[80] w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
          style={position}
          role="menu"
          aria-label={`ดาวน์โหลดผลลัพธ์ ${job.original_filename}`}
        >
          <DownloadLink job={job} kind="original" setError={setError} menu onSelect={close} />
          {job.status === 'DONE' && (
            <>
              <DownloadLink job={job} kind="highlighted" setError={setError} menu onSelect={close} />
              <DownloadLink job={job} kind="excel" setError={setError} menu onSelect={close} />
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

function JobActionMenu({ job, setError, onDelete }) {
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const [position, setPosition] = useState(null)

  function close() {
    setPosition(null)
  }

  function toggle() {
    if (position) return close()
    const rect = buttonRef.current.getBoundingClientRect()
    const above = window.innerHeight - rect.bottom < 260
    setPosition({
      right: Math.max(12, window.innerWidth - rect.right),
      ...(above ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }),
    })
  }

  useEffect(() => {
    if (!position) return
    menuRef.current?.querySelector('button:not(:disabled)')?.focus()
    const outside = (event) => {
      if (!menuRef.current?.contains(event.target) && !buttonRef.current?.contains(event.target)) close()
    }
    const escape = (event) => {
      if (event.key === 'Escape') {
        close()
        buttonRef.current?.focus()
      }
    }
    window.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', escape)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', escape)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [position])

  return (
    <>
      <button
        ref={buttonRef}
        className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-200 bg-white p-0 text-xs font-bold text-gray-700 transition hover:bg-gray-50 md:h-auto md:w-auto md:flex-1 md:px-3 md:py-2"
        title="เปิดเมนูจัดการเอกสาร"
        aria-label="เปิดเมนูจัดการเอกสาร"
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={toggle}
      >
        <MoreHorizontal size={18} className="md:hidden" />
        <span className="hidden md:inline">จัดการ</span>
        <ChevronDown size={14} className={`hidden transition md:block ${position ? 'rotate-180' : ''}`} />
      </button>
      {position && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[80] w-56 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg"
          style={position}
          role="menu"
          aria-label={`จัดการ ${job.original_filename}`}
        >
          <DownloadLink job={job} kind="original" setError={setError} menu onSelect={close} />
          {job.status === 'DONE' && (
            <>
              <DownloadLink job={job} kind="highlighted" setError={setError} menu onSelect={close} />
              <DownloadLink job={job} kind="excel" setError={setError} menu onSelect={close} />
            </>
          )}
          {onDelete && job.status !== 'PROCESSING' && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button
                className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                role="menuitem"
                title="ลบรายการเอกสาร"
                onClick={() => { close(); onDelete(job); }}
              >
                <Trash2 size={16} />
                <span>ลบรายการ</span>
              </button>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

function JobTable({ jobs, compact = false, setError, onDelete, onFindings }) {
  return (
    <div className="font-app">
      {/* Desktop view */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-gray-100">
        <table className="w-full min-w-[720px] table-auto border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3">Document</th>
              <th className="px-5 py-3">Owner</th>
              <th className="px-5 py-3 text-center">Amount</th>
              <th className="px-5 py-3 text-center">Duration</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <tr key={job.id} className={`${compact ? 'h-[64px]' : 'h-[72px]'} hover:bg-gray-50 transition text-sm`}>
                <td className="px-5 py-4 font-semibold text-gray-900">
                  <div className="flex items-center">
                    <div className="mr-2 flex items-center justify-center w-7 h-8 bg-red-50 border border-red-100 rounded text-red-500 font-bold text-[8px] relative pt-2 shrink-0 select-none">
                      <span className="absolute top-0.5 text-[6px] text-red-400 font-semibold">{fileExtLabel(job.original_filename)}</span>
                      <FileText size={12} className="mt-1" />
                    </div>
                    <span className="truncate max-w-[200px] lg:max-w-[280px]" title={job.original_filename}>
                      {job.original_filename}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-xs font-semibold text-gray-400"><span className="block truncate max-w-[150px]" title={job.user_email}>{job.user_email}</span></td>
                <td className="px-5 py-4 font-bold text-gray-700 text-center">{job.finding_count || 0}</td>
                <td className="px-5 py-4 text-center text-xs font-semibold text-gray-500">{formatDuration(job.elapsed_seconds)}</td>
                <td className="px-5 py-4 text-xs font-semibold text-gray-400">{formatThaiDate(job.created_at)}</td>
                <td className="px-5 py-4 text-center">{getStatusBadge(job.status)}</td>
                <td className="px-5 py-4 text-center">
                  <div className="flex w-full flex-nowrap items-center justify-center gap-2">
                    {job.status === 'DONE' && (
                      <button 
                        className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-white p-0 text-xs font-bold text-[#1d55b6] transition hover:bg-[#eef6ff] md:h-auto md:w-auto md:flex-1 md:px-3 md:py-2"
                        title="ดูผลการตรวจสอบ"
                        aria-label="ดูผลการตรวจสอบ"
                        onClick={() => onFindings?.(job)}
                      >
                        <Eye size={16} />
                        <span className="hidden md:inline">ดูผลตรวจ</span>
                      </button>
                    )}
                    <JobActionMenu job={job} setError={setError} onDelete={onDelete} />
                  </div>
                </td>
              </tr>
            ))}
            {!jobs.length && (
              <tr>
                <td className="px-5 py-12 text-center text-sm font-semibold text-gray-400" colSpan="7">
                  ไม่พบเอกสารในประวัติ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile list view */}
      <div className="block md:hidden space-y-4 animate-fade-in">
        {jobs.map((job) => (
          <div key={job.id} className="card p-4 space-y-3 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                <div className="mr-2 flex items-center justify-center w-7 h-8 bg-red-50 border border-red-100 rounded text-red-500 font-bold text-[8px] relative pt-2 shrink-0">
                  <span className="absolute top-0.5 text-[6px] text-red-400 font-semibold">{fileExtLabel(job.original_filename)}</span>
                  <FileText size={12} className="mt-1" />
                </div>
                <div className="font-semibold text-gray-900 truncate" title={job.original_filename}>
                  {job.original_filename}
                </div>
              </div>
              <div className="shrink-0">{getStatusBadge(job.status)}</div>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1 font-semibold">
              <div><span className="text-gray-400">ผู้ใช้งาน:</span> {job.user_email}</div>
              <div className="flex justify-between">
                <span><span className="text-gray-400">วันที่:</span> {formatThaiDate(job.created_at)}</span>
                <span><span className="text-gray-400">เวลา:</span> {formatDuration(job.elapsed_seconds)}</span>
              </div>
              <div className="text-sm font-bold text-gray-800">คำผิด: {job.finding_count || 0} issues</div>
            </div>
            
            <div className="flex w-full flex-nowrap items-center justify-end gap-2 border-t border-gray-100 pt-2">
              {job.status === 'DONE' && (
                <button 
                  className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-blue-200 bg-white p-0 text-xs font-bold text-[#1d55b6] transition hover:bg-[#eef6ff] md:h-auto md:w-auto md:flex-1 md:px-3 md:py-2"
                  title="ดูผลการตรวจสอบ"
                  aria-label="ดูผลการตรวจสอบ"
                  onClick={() => onFindings?.(job)}
                >
                  <Eye size={16} />
                  <span className="hidden md:inline">ดูผลตรวจ</span>
                </button>
              )}
              <JobActionMenu job={job} setError={setError} onDelete={onDelete} />
            </div>
          </div>
        ))}
        {!jobs.length && (
          <div className="card p-8 text-center text-sm font-semibold text-gray-400 bg-white">
            ไม่พบเอกสารในประวัติ
          </div>
        )}
      </div>
    </div>
  )
}

function Dictionary({ setError, setAlert, setConfirm }) {
  const [items, setItems] = useState([])
  const [wrong, setWrong] = useState('')
  const [correct, setCorrect] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [editId, setEditId] = useState(null)

  async function load() { 
    try {
      const res = await request('/api/admin/dictionary')
      setItems(res) 
    } catch(err) {
      setError(err.message)
    }
  }
  
  useEffect(() => { load() }, [])
  
  async function submit(e) {
    e.preventDefault()
    if (!wrong.trim() || !correct.trim()) {
      setAlert({ type: 'error', message: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
      return
    }
    try {
      if (editId) {
        await request(`/api/admin/dictionary/${editId}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ wrong: wrong.trim(), correct: correct.trim() }) 
        })
        setAlert({ type: 'success', message: 'แก้ไขคำศัพท์เรียบร้อยแล้ว' })
        setEditId(null)
      } else {
        await request('/api/admin/dictionary', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ wrong: wrong.trim(), correct: correct.trim() }) 
        })
        setAlert({ type: 'success', message: 'เพิ่มคำศัพท์ใหม่เรียบร้อยแล้ว' })
      }
      setWrong('')
      setCorrect('')
      load()
    } catch (err) { 
      setAlert({ type: 'error', message: err.message }) 
    }
  }

  function startEdit(item) {
    setEditId(item.id)
    setWrong(item.wrong)
    setCorrect(item.correct)
  }

  function cancelEdit() {
    setEditId(null)
    setWrong('')
    setCorrect('')
  }

  function deleteItem(item) {
    setConfirm({
      message: `คุณต้องการลบคำศัพท์ "${item.wrong} -> ${item.correct}" จากคลังคำศัพท์ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          await request(`/api/admin/dictionary/${item.id}`, { method: 'DELETE' })
          setAlert({ type: 'success', message: 'ลบคำศัพท์เรียบร้อยแล้ว' })
          load()
        } catch (err) {
          setAlert({ type: 'error', message: err.message })
        }
      }
    })
  }

  const filtered = items.filter(item => 
    item.wrong.toLowerCase().includes(search.toLowerCase()) || 
    item.correct.toLowerCase().includes(search.toLowerCase())
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <Page title="คลังคำศัพท์ (Dictionary)">
      {/* Create/Edit Form */}
      <form className="card mb-6 p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end bg-white" onSubmit={submit}>
        <div className="space-y-1.5 w-full font-app">
          <span className="text-xs font-bold text-gray-400 block">คำผิด</span>
          <input 
            className="h-12 w-full rounded-xl border border-[var(--border)] px-4 outline-none focus:border-[var(--accent)] font-semibold transition" 
            value={wrong} 
            onChange={e => setWrong(e.target.value)} 
            placeholder="คำผิด เช่น บุคคลากร" 
          />
        </div>
        <div className="space-y-1.5 w-full font-app">
          <span className="text-xs font-bold text-gray-400 block">คำที่ถูกต้อง</span>
          <input 
            className="h-12 w-full rounded-xl border border-[var(--border)] px-4 outline-none focus:border-[var(--accent)] font-semibold transition" 
            value={correct} 
            onChange={e => setCorrect(e.target.value)} 
            placeholder="คำที่ถูก เช่น บุคลากร" 
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto font-app">
          <button type="submit" className="h-12 px-6 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-sm font-bold transition flex-1 md:flex-none">
            {editId ? 'บันทึกการแก้ไข' : 'เพิ่มคำศัพท์'}
          </button>
          {editId && (
            <button type="button" onClick={cancelEdit} className="h-12 px-4 border border-[var(--border)] bg-white hover:bg-[var(--surface-2)] rounded-xl text-sm font-semibold transition flex-1 md:flex-none">
              ยกเลิก
            </button>
          )}
        </div>
      </form>

      {/* Filter and Search */}
      <div className="mb-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white/50 backdrop-blur p-3 rounded-2xl border border-[var(--border)] font-app">
        <div className="flex-1 max-w-md relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="ค้นหาคำศัพท์..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            className="h-10 w-full pl-10 pr-4 rounded-xl border border-[var(--border)] bg-white text-sm outline-none focus:border-[var(--accent)] transition font-semibold"
          />
        </div>
      </div>

      {/* Table & Cards */}
      <div className="card overflow-hidden bg-white shadow-sm font-app">
        {/* Desktop View */}
        <table className="w-full border-collapse hidden md:table">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
              <th className="px-5 py-3 w-16 text-center">#</th>
              <th className="px-5 py-3">คำสะกดผิด</th>
              <th className="px-5 py-3">คำแนะนำการแก้ไข</th>
              <th className="px-5 py-3 w-28 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {visibleItems.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50 transition">
                <td className="px-5 py-4 text-center text-gray-400 font-bold">{(currentPage - 1) * pageSize + index + 1}</td>
                <td className="px-5 py-4 font-bold text-red-500">{item.wrong}</td>
                <td className="px-5 py-4 font-bold text-green-600">{item.correct}</td>
                <td className="px-5 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => startEdit(item)} 
                      className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 bg-white"
                      title="แก้ไขคำศัพท์"
                    >
                      <Pencil size={15} />
                    </button>
                    <button 
                      onClick={() => deleteItem(item)} 
                      className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 bg-white"
                      title="ลบคำศัพท์"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td className="px-5 py-12 text-center text-sm font-semibold text-gray-400" colSpan="4">
                  ไม่พบข้อมูลคำศัพท์ในคลัง
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile Card List View */}
        <div className="block md:hidden divide-y divide-gray-100 text-sm">
          {visibleItems.map((item, index) => (
            <div key={item.id} className="p-4 flex items-center justify-between gap-4 bg-white animate-fade-in">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-bold">#{(currentPage - 1) * pageSize + index + 1}</span>
                  <span className="font-bold text-red-500 line-through truncate max-w-[120px]" title={item.wrong}>{item.wrong}</span>
                  <span className="text-xs text-gray-400">→</span>
                  <span className="font-bold text-green-600 truncate max-w-[120px]" title={item.correct}>{item.correct}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => startEdit(item)} 
                  className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 bg-white"
                >
                  <Pencil size={14} />
                </button>
                <button 
                  onClick={() => deleteItem(item)} 
                  className="rounded-lg border border-red-200 p-2 text-red-500 hover:bg-red-50 bg-white"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="p-8 text-center text-sm font-semibold text-gray-400">
              ไม่พบข้อมูลคำศัพท์ในคลัง
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <Pagination 
              page={currentPage} 
              setPage={setPage} 
              total={filtered.length} 
              pageSize={pageSize} 
              setPageSize={setPageSize} 
            />
          </div>
        )}
      </div>
    </Page>
  )
}

function Admin({ setAlert, setConfirm }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  async function load() { 
    try {
      const res = await request('/api/admin/users')
      setUsers(res)
    } catch(err) {
      setAlert({ type: 'error', message: err.message })
    }
  }

  useEffect(() => { load() }, [])

  async function toggleAdmin(user) {
    const nextVal = !user.is_admin
    setConfirm({
      message: `คุณต้องการ${nextVal ? 'แต่งตั้ง' : 'ยกเลิก'}สิทธิ์ผู้ดูแลระบบให้กับอีเมล "${user.email}" ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          await request(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_admin: nextVal })
          })
          setAlert({ type: 'success', message: 'ปรับปรุงสิทธิ์เรียบร้อยแล้ว' })
          load()
        } catch (err) {
          setAlert({ type: 'error', message: err.message })
        }
      }
    })
  }

  async function toggleBlock(user) {
    const nextVal = !user.is_blocked
    setConfirm({
      message: `คุณต้องการ${nextVal ? 'ระงับการใช้งาน' : 'ปลดการระงับ'}บัญชีอีเมล "${user.email}" ใช่หรือไม่?`,
      onConfirm: async () => {
        try {
          await request(`/api/admin/users/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_blocked: nextVal })
          })
          setAlert({ type: 'success', message: nextVal ? 'ระงับบัญชีผู้ใช้งานแล้ว' : 'เปิดใช้งานบัญชีผู้ใช้งานแล้ว' })
          load()
        } catch (err) {
          setAlert({ type: 'error', message: err.message })
        }
      }
    })
  }

  const filtered = users.filter(u => 
    u.email.toLowerCase().includes(search.toLowerCase()) || 
    (u.name && u.name.toLowerCase().includes(search.toLowerCase()))
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleUsers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <Page title="จัดการผู้ใช้งาน">
      <div className="max-w-4xl font-app">
        <p className="text-sm text-gray-500 mb-4 font-medium">จัดการบทบาทและสิทธิ์การเข้าถึงข้อมูลในระบบ</p>
        
        {/* Search */}
        <div className="mb-4 max-w-md relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="ค้นหาผู้ใช้งานด้วยอีเมล หรือ ชื่อ..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            className="h-10 w-full pl-10 pr-4 rounded-xl border border-[var(--border)] bg-white text-sm outline-none focus:border-[var(--accent)] transition font-semibold"
          />
        </div>

        <div className="card overflow-hidden bg-white shadow-sm">
          {/* Desktop Table View */}
          <table className="w-full border-collapse hidden md:table">
            <thead>
              <tr className="bg-gray-50 text-left border-b border-gray-100 text-xs font-semibold text-gray-500">
                <th className="px-5 py-3">อีเมล / ชื่อผู้ใช้งาน</th>
                <th className="px-5 py-3 w-28">ประเภทบัญชี</th>
                <th className="px-5 py-3 w-36">สิทธิ์ผู้ดูแลระบบ</th>
                <th className="px-5 py-3 w-36">สถานะการบัญชี</th>
                <th className="px-5 py-3 w-40 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {visibleUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900">{u.name || '-'}</div>
                    <div className="text-xs text-gray-400 font-semibold mt-0.5">{u.email}</div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-500 font-bold">{u.type}</td>
                  <td className="px-5 py-4">
                    {u.is_admin ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">ผู้ดูแลระบบ</span>
                    ) : (
                      <span className="text-gray-400 font-semibold">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {u.is_blocked ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">ระงับการใช้งาน</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-600">ปกติ</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => toggleAdmin(u)} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition bg-white shadow-sm ${
                          u.is_admin 
                            ? 'border-blue-200 text-blue-600 hover:bg-blue-50' 
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                        title={u.is_admin ? 'ถอนสิทธิ์ผู้ดูแลระบบ' : 'แต่งตั้งเป็นผู้ดูแลระบบ'}
                      >
                        สิทธิ์ Admin
                      </button>
                      <button 
                        onClick={() => toggleBlock(u)} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition bg-white shadow-sm ${
                          u.is_blocked 
                            ? 'border-green-200 text-green-600 hover:bg-green-50' 
                            : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                        title={u.is_blocked ? 'เปิดใช้งานบัญชี' : 'ระงับการบัญชี'}
                      >
                        {u.is_blocked ? 'ปลดบล็อก' : 'บล็อก'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="px-5 py-12 text-center text-sm font-semibold text-gray-400" colSpan="5">
                    ไม่พบข้อมูลผู้ใช้งาน
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="block md:hidden divide-y divide-gray-100 text-sm">
            {visibleUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3 bg-white animate-fade-in">
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="font-semibold text-gray-900 truncate" title={u.name || '-'}>{u.name || '-'}</div>
                    <div className="text-xs text-gray-400 font-semibold mt-0.5 truncate" title={u.email}>{u.email}</div>
                  </div>
                  <span className="text-xs text-gray-500 font-bold shrink-0">{u.type}</span>
                </div>
                <div className="flex gap-2">
                  {u.is_admin && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">ผู้ดูแลระบบ</span>}
                  {u.is_blocked ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600">ระงับการใช้งาน</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-600">ปกติ</span>
                  )}
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100 font-app">
                  <button 
                    onClick={() => toggleAdmin(u)} 
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 bg-white"
                  >
                    {u.is_admin ? 'ยกเลิกสิทธิ์ Admin' : 'ตั้งเป็น Admin'}
                  </button>
                  <button 
                    onClick={() => toggleBlock(u)} 
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      u.is_blocked ? 'border-green-200 text-green-600 bg-[#eefcf2]' : 'border-red-200 text-red-600 bg-[#ffe9e7]'
                    }`}
                  >
                    {u.is_blocked ? 'ปลดบล็อก' : 'ระงับบัญชี'}
                  </button>
                </div>
              </div>
            ))}
            {!filtered.length && (
              <div className="p-8 text-center text-sm font-semibold text-gray-400">
                ไม่พบข้อมูลผู้ใช้งาน
              </div>
            )}
          </div>

          {filtered.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <Pagination 
                page={currentPage} 
                setPage={setPage} 
                total={filtered.length} 
                pageSize={pageSize} 
                setPageSize={setPageSize} 
              />
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

function ErrorStats() {
  const [stats, setStats] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    request('/api/admin/finding-stats').then(setStats)
  }, [])

  const filtered = stats.filter(s => 
    s.found.toLowerCase().includes(search.toLowerCase()) || 
    s.suggestion.toLowerCase().includes(search.toLowerCase())
  )

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleStats = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <Page title="สถิติคำผิด">
      <div className="max-w-3xl font-app">
        <p className="text-sm text-gray-500 mb-4 font-medium">สถิติสะกดคำผิดยอดฮิตที่พบในคลังรายงานเอกสารทั้งหมด</p>
        
        {/* Search */}
        <div className="mb-4 max-w-md relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="ค้นหาคำศัพท์สถิติ..." 
            value={search} 
            onChange={e => { setSearch(e.target.value); setPage(1); }} 
            className="h-10 w-full pl-10 pr-4 rounded-xl border border-[var(--border)] bg-white text-sm outline-none focus:border-[var(--accent)] transition font-semibold"
          />
        </div>

        <div className="card overflow-hidden bg-white shadow-sm">
          {/* Desktop view */}
          <table className="w-full border-collapse hidden md:table">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <th className="px-5 py-3">คำสะกดผิด</th>
                <th className="px-5 py-3">คำแนะนำการแก้ไข</th>
                <th className="px-5 py-3 w-44 text-center">ความถี่การตรวจพบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {visibleStats.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4 font-bold text-red-500">{s.found}</td>
                  <td className="px-5 py-4 font-bold text-green-600">{s.suggestion}</td>
                  <td className="px-5 py-4 font-extrabold text-gray-700 text-center">{s.count} ครั้ง</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td className="px-5 py-12 text-center text-sm font-semibold text-gray-400" colSpan="3">
                    ไม่พบข้อมูลสถิติคำสะกดผิด
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="block md:hidden divide-y divide-gray-100 text-sm">
            {visibleStats.map((s, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4 bg-white animate-fade-in">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-red-500 line-through truncate max-w-[120px]" title={s.found}>{s.found}</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="font-bold text-green-600 truncate max-w-[120px]" title={s.suggestion}>{s.suggestion}</span>
                  </div>
                </div>
                <div className="text-xs font-bold text-gray-500 shrink-0">พบ {s.count} ครั้ง</div>
              </div>
            ))}
            {!filtered.length && (
              <div className="p-8 text-center text-sm font-semibold text-gray-400">
                ไม่พบข้อมูลสถิติคำสะกดผิด
              </div>
            )}
          </div>

          {filtered.length > 0 && (
            <div className="p-4 border-t border-gray-100">
              <Pagination 
                page={currentPage} 
                setPage={setPage} 
                total={filtered.length} 
                pageSize={pageSize} 
                setPageSize={setPageSize} 
              />
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}

function Page({ title, action, children }) {
  return (
    <main className="min-h-[calc(100vh-80px)] overflow-auto p-6 animate-fade-in font-app">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </main>
  )
}

function Breadcrumb({ items }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs font-bold text-[var(--muted)] mb-5 bg-white px-3 py-2 rounded-xl border border-[var(--border)] w-fit shadow-sm select-none font-app">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight size={14} className="text-gray-300" />}
            {isLast ? (
              <span className="text-gray-800 font-extrabold truncate max-w-[200px] sm:max-w-xs">{item.label}</span>
            ) : (
              <button 
                onClick={item.onClick} 
                className="text-gray-400 hover:text-[var(--primary)] transition"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

createRoot(document.getElementById('root')).render(<App />)
