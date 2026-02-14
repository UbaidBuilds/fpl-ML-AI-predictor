"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Calendar,
  LayoutDashboard,
  Crown,
  BarChart3,
  Menu,
  X,
  Users,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function Navigation() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Hide nav on landing page
  const isLanding = pathname === "/";

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-colors ${
        isLanding
          ? "bg-transparent border-transparent"
          : "bg-[#0a0e1a]/95 backdrop-blur-md border-white/5"
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-black text-[#00FF87] tracking-tight">
          FPL AI
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavLink href="/players" icon={Users} label="Players" active={pathname === "/players"} />
          <NavLink href="/fixtures" icon={Calendar} label="Fixtures" active={pathname === "/fixtures"} />
          <NavLink href="/compare" icon={BarChart3} label="Compare" active={pathname === "/compare"} />
          {loading ? null : user ? (
            <>
              <NavLink href="/captain-picker" icon={Crown} label="Captain" active={pathname === "/captain-picker"} />
              <NavLink href="/my-team" icon={LayoutDashboard} label="My Team" active={pathname === "/my-team"} />
              <NavLink href="/dashboard" icon={Zap} label="Dashboard" active={pathname === "/dashboard"} />
              <div className="w-px h-6 bg-white/10 mx-2" />
              <span className="text-sm text-slate-400 flex items-center gap-2 px-2">
                <User className="w-4 h-4" />
                {user.name}
              </span>
              <button
                onClick={logout}
                className="text-slate-400 hover:text-white p-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="w-px h-6 bg-white/10 mx-2" />
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-white/5">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-[#00FF87] text-[#0a0e1a] hover:bg-[#00e676] font-bold">
                  Sign Up
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-white/5 bg-[#111827]"
          >
            <div className="container mx-auto px-4 py-2 flex flex-col">
              <MobileNavLink href="/players" icon={Users} label="Players" active={pathname === "/players"} />
              <MobileNavLink href="/fixtures" icon={Calendar} label="Fixtures" active={pathname === "/fixtures"} />
              <MobileNavLink href="/compare" icon={BarChart3} label="Compare Players" active={pathname === "/compare"} />
              {loading ? null : user ? (
                <>
                  <MobileNavLink href="/captain-picker" icon={Crown} label="Captain Picker" active={pathname === "/captain-picker"} />
                  <MobileNavLink href="/my-team" icon={LayoutDashboard} label="My Team" active={pathname === "/my-team"} />
                  <MobileNavLink href="/dashboard" icon={Zap} label="Dashboard" active={pathname === "/dashboard"} />
                  <div className="border-t border-white/5 my-2" />
                  <div className="flex items-center justify-between py-3 px-2">
                    <span className="text-sm text-slate-400 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {user.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={logout}
                      className="text-slate-400 hover:text-white hover:bg-white/5"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-t border-white/5 my-2" />
                  <div className="flex gap-3 py-3 px-2">
                    <Link href="/login" className="flex-1">
                      <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/5">
                        Login
                      </Button>
                    </Link>
                    <Link href="/register" className="flex-1">
                      <Button className="w-full bg-[#00FF87] text-[#0a0e1a] hover:bg-[#00e676] font-bold">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
        active
          ? "text-[#00FF87] bg-white/5"
          : "text-slate-400 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 min-h-[44px] py-3 px-2 rounded-lg transition-colors ${
        active
          ? "text-[#00FF87] bg-white/5"
          : "text-slate-300 hover:text-[#00FF87] hover:bg-white/5"
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </Link>
  );
}
