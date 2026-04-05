import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import SignOutButton from "@/components/auth/SignOutButton";

interface NavbarProps {
  user: User;
}

export default function Navbar({ user }: NavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">M</span>
            </div>
            <span className="font-semibold text-gray-900">Manobra</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Dashboard
            </Link>
          </div>

          {/* User */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-600 truncate max-w-[180px]">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
