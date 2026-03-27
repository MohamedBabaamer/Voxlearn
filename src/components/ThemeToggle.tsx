import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('light');
        } else {
            // If system, toggle to light
            setTheme('light');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
            title="Switch to Light Mode"
            aria-label="Toggle theme"
        >
            <span className="material-symbols-outlined text-[20px]">light_mode</span>
        </button>
    );
};

export default ThemeToggle;