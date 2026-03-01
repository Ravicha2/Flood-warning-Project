import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Droplet } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Flood Warning System | Early Detection & Routing',
  description: 'Real-time flood risk mapping and evacuation routing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-200 dark:selection:bg-blue-900 transition-colors`}>
        {/* Decorative background gradient */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-white dark:from-blue-900/20 dark:via-slate-950 dark:to-slate-950 pointer-events-none" />

        <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center space-x-2 font-bold text-xl group">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded-lg shadow-sm group-hover:shadow-md transition-all">
                  <Droplet className="w-5 h-5 text-white" />
                </div>
                <span className="gradient-text font-extrabold tracking-tight">FloodGuard</span>
              </Link>
              <nav className="flex space-x-1 sm:space-x-4 text-sm font-medium">
                <Link href="/" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Home</Link>
                <Link href="/check" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Check Risk</Link>
                <Link href="/map" className="px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Live Map</Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm text-slate-500 dark:text-slate-400 py-8 text-center text-sm mt-auto">
          <p className="flex items-center justify-center gap-1">
            <Droplet className="w-4 h-4 opacity-50" />
            &copy; {new Date().getFullYear()} Flood Warning System. Built with Next.js.
          </p>
        </footer>
      </body>
    </html>
  );
}
