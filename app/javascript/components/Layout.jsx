import { Link } from "@inertiajs/react"

export default function Layout({ children }) {
  return (
    <div className="min-h-screen p-4 md:p-8">
      <Nav />
      <main className="max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}

function Nav() {
  return (
    <nav className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-8 md:mb-12 border-b border-[var(--ledger-border)] pb-6">
      <div className="flex items-center justify-between w-full md:w-auto gap-4">
        <Link href="/" className="text-2xl md:text-3xl font-black tracking-tighter leading-none italic hover:opacity-80 transition-opacity">
          SEE <span className="text-[var(--accent-var)]">VAR</span>
        </Link>
        <div className="h-8 w-px bg-zinc-800 hidden md:block" />
        <div className="md:hidden flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <div className="w-9 h-9 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 flex items-center justify-center">
              <UserIcon className="w-[18px] h-[18px] text-zinc-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-zinc-900 flex items-center justify-center p-0.5 shadow-lg z-10">
              <span className="text-[8px] font-black text-black leading-none">인</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex-1 w-full max-w-md">
        <input
          type="text"
          placeholder="SEARCH MATCH, PLAYER, DATA..."
          autoComplete="off"
          className="w-full bg-[#1c1f24] border border-[var(--ledger-border)] px-4 py-2 text-xs md:text-sm font-mono focus:outline-none focus:border-[var(--accent-var)] transition-colors"
        />
        <span className="absolute right-3 top-2.5 opacity-30 pointer-events-none">
          <SearchIcon className="w-4 h-4" />
        </span>
      </div>

      <div className="flex items-center justify-center md:justify-end gap-4 md:gap-8 text-[10px] md:text-xs font-bold tracking-widest font-mono w-full md:w-auto overflow-x-auto no-scrollbar py-2 md:py-0">
        <Link href="#" className="menu-link text-[var(--text-muted)] hover:text-white whitespace-nowrap">ABOUT</Link>
        <Link href="/matches" className="menu-link text-[var(--text-muted)] hover:text-white whitespace-nowrap">ARCHIVE</Link>
        <Link href="#" className="menu-link text-[var(--text-muted)] hover:text-white whitespace-nowrap">REFEREES</Link>
        <Link href="#" className="menu-link text-[var(--text-muted)] hover:text-white whitespace-nowrap">TEAMS</Link>

        <div className="hidden md:flex items-center gap-3 pl-4 border-l border-zinc-800 cursor-pointer group">
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-[var(--text-muted)] leading-none mb-1 uppercase">Supporting</span>
            <span className="text-[10px] text-white leading-none font-black italic">인천 유나이티드</span>
          </div>
          <div className="relative">
            <div className="w-11 h-11 rounded-full border border-zinc-700 overflow-hidden bg-zinc-800 flex items-center justify-center group-hover:border-white transition-colors">
              <UserIcon className="w-[22px] h-[22px] text-zinc-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border border-zinc-900 flex items-center justify-center p-0.5 shadow-lg z-10">
              <span className="text-[9px] font-black text-black leading-none">인</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

function UserIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}
