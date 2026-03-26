import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../services/database.service';
import type { UserProfile } from '../types';

const Home: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const userProfile = await getUserProfile(user.uid);
          setProfile(userProfile);
        } catch (error) {
          console.error('Error fetching profile:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const displayName = profile?.displayName || user?.displayName || 'Student';

  const years = [
    { id: 1, title: 'Year 1', subtitle: 'Licence 1 (L1)', level: 'L1', icon: 'menu_book', color: 'text-blue-600', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-700/40', darkColor: 'dark:text-blue-400' },
    { id: 2, title: 'Year 2', subtitle: 'Licence 2 (L2)', level: 'L2', icon: 'code', color: 'text-indigo-600', bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-700/40', darkColor: 'dark:text-indigo-400' },
    { id: 3, title: 'Year 3', subtitle: 'Licence 3 (L3)', level: 'L3', icon: 'functions', color: 'text-violet-600', bg: 'bg-violet-50', darkBg: 'dark:bg-violet-700/40', darkColor: 'dark:text-violet-400' },
    { id: 4, title: 'Master 1', subtitle: 'Research & Dev', level: 'M1', icon: 'science', color: 'text-emerald-600', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-700/40', darkColor: 'dark:text-emerald-400' },
    { id: 5, title: 'Master 2', subtitle: 'Thesis & Grad', level: 'M2', icon: 'workspace_premium', color: 'text-amber-600', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-700/40', darkColor: 'dark:text-amber-400' },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 z-50 flex items-center justify-center">
        <div className="text-center space-y-8 p-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 dark:bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl dark:shadow-2xl border border-slate-200 dark:border-slate-700/50">
              <span className="material-symbols-outlined text-7xl text-primary dark:text-primary/90 animate-bounce">
                home
              </span>
            </div>
          </div>

          <div className="flex justify-center items-center gap-3">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-700/50 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary dark:border-primary/80 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '0.6s' }}></div>
              <div className="absolute inset-2 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
              <div className="absolute inset-2 border-4 border-primary/50 dark:border-primary/30 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.5s' }}></div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Loading your dashboard...
            </p>

            <div className="flex justify-center gap-2 pt-2">
              <div className="w-2 h-2 bg-primary dark:bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-primary dark:bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-primary dark:bg-primary/80 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>

          <div className="w-64 mx-auto">
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/60 dark:from-primary/80 dark:to-primary/40 rounded-full" style={{ width: '100%', animation: 'shimmer 0.8s ease-in-out infinite' }}></div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Welcome back, <span className="text-primary">{displayName}</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
          Academic Dashboard: Computer Science & Mathematics. Select your academic year below to access resources.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {years.map((year) => (
          <Link
            key={year.id}
            to={`/dashboard?level=${year.level}`}
            className="group relative flex flex-col justify-between h-64 p-6 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-xl dark:hover:shadow-xl hover:border-primary/50 dark:hover:border-primary/40 transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="absolute right-[-20px] top-[-20px] opacity-30 dark:opacity-20 rotate-12 transition-transform group-hover:scale-110 duration-500 pointer-events-none">
              <span className="material-symbols-outlined text-[180px] text-slate-900 dark:text-slate-400">{year.icon}</span>
            </div>

            <div className="relative z-10 flex justify-between items-start">
              <div className={`size-14 rounded-xl ${year.bg} ${year.color} ${year.darkBg} ${year.darkColor} flex items-center justify-center shadow-sm dark:shadow-md transition-all duration-300`}>
                <span className="material-symbols-outlined text-[32px]">{year.icon}</span>
              </div>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-500 group-hover:text-primary dark:group-hover:text-primary/80 transition-colors">arrow_forward</span>
            </div>

            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{year.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{year.subtitle}</p>
            </div>

            <div className="relative z-10 mt-auto pt-4">
              <div className="text-sm font-bold text-primary dark:text-primary/90 group-hover:underline flex items-center gap-1">
                View Courses <span className="material-symbols-outlined text-[16px]">arrow_right_alt</span>
              </div>
            </div>
          </Link>
        ))}

        {/* Library Card */}
        <div className="group relative flex flex-col justify-center items-center h-64 p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600/60 hover:border-primary/50 dark:hover:border-primary/40 hover:bg-white dark:hover:bg-slate-800/60 transition-all duration-300 cursor-pointer text-center gap-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-700/40 group-hover:bg-primary/10 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:text-primary dark:group-hover:text-primary/90 transition-colors">
            <span className="material-symbols-outlined text-[32px]">local_library</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Library Portal</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Access research papers</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;