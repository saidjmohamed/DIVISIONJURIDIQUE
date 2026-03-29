'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Scale, User } from 'lucide-react';

export default function TopNav() {
  return (
    <header className="sticky top-0 z-50 safe-top">
      <div className="bg-gradient-to-l from-sky-500 to-blue-600 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          {/* App Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Scale className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">
                الشامل ⚖️
              </h1>
              <p className="text-xs text-sky-100">
                منصة القانون الجزائري
              </p>
            </div>
          </div>

          {/* Profile Avatar */}
          <Avatar className="h-9 w-9 border-2 border-white/30">
            <AvatarFallback className="bg-white/20 text-white">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
