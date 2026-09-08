import Link from "next/link";
import {
  Users,
  Compass,
  FolderGit2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Code2,
  Laptop,
  CheckCircle2,
  Layers,
  Send,
  Zap,
} from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f4f1ea] dark:bg-[#0f0f17] text-gray-900 dark:text-white transition-colors duration-200">
      {/* ── Top Navbar ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#0f0f17]/80 border-b border-gray-200/80 dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-md shadow-primary/20">
              <Users size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              Nexora<span className="text-primary">.</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
            <a href="#roles" className="hover:text-primary transition-colors">Roles & Stacks</a>
            <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <Link
              href="/login"
              className="text-sm font-semibold px-4 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary-600 transition-all shadow-sm shadow-primary/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────── */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-6">
              <Zap size={14} />
              <span>Student Teammate Discovery & Project Collaboration</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 dark:text-white leading-[1.1]">
              Find the right people to{" "}
              <span className="text-primary underline decoration-primary/30 decoration-wavy">
                build with.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
              Nexora connects ambitious student developers, designers, and creators.
              Discover compatible teammates, recruit for open project roles, and assemble
              winning hackathon squads with clear, explainable compatibility.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold text-base hover:bg-primary-600 transition-all shadow-lg shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Create Your Builder Profile</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl border border-gray-300 dark:border-white/10 bg-white/60 dark:bg-white/[0.04] text-gray-800 dark:text-gray-100 font-bold text-base hover:bg-white dark:hover:bg-white/[0.08] transition-all"
              >
                <span>Browse Projects</span>
              </Link>
            </div>
          </div>

          {/* ── Hero Preview Card ───────────────────────────────── */}
          <div className="mt-16 max-w-4xl mx-auto rounded-3xl border border-gray-200 dark:border-white/[0.1] bg-white/80 dark:bg-[#16162a]/80 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-black text-xl">
                  JD
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Jayesh Dave</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-500/20">
                      Open to Teams
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Full-Stack Engineer • Computer Science &apos;27</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 px-4 py-2.5 rounded-2xl border border-primary/15">
                <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm">
                  94%
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-gray-900 dark:text-white">Compatibility Score</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Complementary backend + hackathon availability</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-sm">
              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tech Stack</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] font-medium">React</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] font-medium">FastAPI</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] font-medium">PostgreSQL</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Looking For</p>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">UI/UX Designer or Mobile Dev for Fall Hackathon</p>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04]">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Project Activity</p>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Building an open-source campus resource radar</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pillars / Features Grid ──────────────────────────── */}
      <section id="features" className="py-20 border-t border-gray-200/80 dark:border-white/[0.06] bg-white/50 dark:bg-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Everything you need to form winning teams
            </h2>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400">
              No more awkward Discord pings or ghosted Reddit threads. Nexora gives student builders a dedicated space to collaborate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#16162a] border border-gray-200/90 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <Code2 size={22} />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Structured Profiles</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Showcase proven technologies, roles, portfolio projects, GitHub links, and bandwidth.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#16162a] border border-gray-200/90 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <ShieldCheck size={22} />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Explainable Match</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Deterministic compatibility scores that clearly explain skill complementarity and mutual hackathon goals.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#16162a] border border-gray-200/90 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <FolderGit2 size={22} />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Project Recruitment</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Post your ideas, specify required skills and open roles, and manage join applications in one place.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#16162a] border border-gray-200/90 dark:border-white/[0.08] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                <Users size={22} />
              </div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Hackathon Squads</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Form balanced teams with frontend devs, backend builders, designers, and presenters before deadlines.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              How Nexora Works
            </h2>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-400">
              From solo builder to full-fledged project team in three straightforward steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-white/[0.06] relative">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-lg mb-6">
                1
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">Build Your Profile</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                List your primary skills, preferred roles, university, past projects, and what kind of project you want to build next.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-white/[0.06] relative">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-lg mb-6">
                2
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">Explore & Filter</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Search students by technical skills or browse projects seeking contributors. Review transparent compatibility indicators.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-white/[0.06] relative">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-lg mb-6">
                3
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-3">Connect & Ship</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Send a connect request or apply directly to an open role. Assemble your team and build things that matter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ───────────────────────────────────────── */}
      <section id="faq" className="py-20 border-t border-gray-200/80 dark:border-white/[0.06] bg-white/50 dark:bg-black/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-white/[0.06]">
              <h4 className="font-bold text-base text-gray-900 dark:text-white mb-2">Who is Nexora for?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Nexora is built for university students and independent developers looking for project partners, hackathon squad members, capstone teammates, or co-founders.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-white/[0.06]">
              <h4 className="font-bold text-base text-gray-900 dark:text-white mb-2">How does the compatibility match score work?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Match Score V1 is deterministic and explainable. It calculates overlap and synergy between your skills, required project roles, timezones, and hackathon intent—no mysterious black-box algorithms.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#16162a] border border-gray-200 dark:border-white/[0.06]">
              <h4 className="font-bold text-base text-gray-900 dark:text-white mb-2">Can I both post projects and join existing teams?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Yes! You can recruit teammates for your own ideas or apply to join projects created by other students.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-gray-200 dark:border-white/[0.08] text-center text-xs text-gray-500 dark:text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Nexora. Find the right people to build with.</p>
          <div className="flex gap-6 font-semibold">
            <Link href="/login" className="hover:text-primary transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-primary transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

