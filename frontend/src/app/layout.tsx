import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { Droplet } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FloodGuard - Early Detection & Safe Evacuation Routing',
  description: 'Unlocking next-generation flood intelligence. FloodGuard uses real-time sensors, predictive modeling, and safe routing to empower communities before, during, and after a crisis.',
  keywords: ['flood warning', 'evacuation routes', 'real-time flood map', 'disaster management', 'predictive modeling', 'flood risk'],
  openGraph: {
    title: 'FloodGuard - Early Detection & Safe Evacuation Routing',
    description: 'Empowering communities with real-time flood mapping and AI prediction insights to stay safe during emergencies.',
    type: 'website',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-brand-50 dark:bg-brand-950 text-slate-900 dark:text-brand-50 selection:bg-brand-200 dark:selection:bg-brand-800 transition-colors`}>
        {/* Dominant Blue Background */}
        <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-200/40 via-brand-50 to-white dark:from-brand-900/40 dark:via-brand-950 dark:to-slate-950 pointer-events-none" />

        <header className="sticky top-0 z-50 w-full border-b border-brand-200/50 dark:border-brand-800/50 bg-white/70 dark:bg-brand-900/40 backdrop-blur-lg transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center space-x-2 font-bold text-xl group">
                <div className="bg-gradient-to-br from-brand-600 to-indigo-700 p-1.5 rounded-lg shadow-sm group-hover:shadow-brand-500/50 transition-all">
                  <Droplet className="w-5 h-5 text-white" />
                </div>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-700 to-indigo-800 dark:from-brand-300 dark:to-indigo-300 font-extrabold tracking-tight">FloodGuard</span>
              </Link>
              <nav className="flex space-x-1 sm:space-x-4 text-sm font-semibold">
                <Link href="/" className="px-3 py-2 text-brand-900 dark:text-brand-100 rounded-md hover:bg-brand-100 dark:hover:bg-brand-800/50 transition-colors">Home</Link>
                <Link href="/check" className="px-3 py-2 text-brand-900 dark:text-brand-100 rounded-md hover:bg-brand-100 dark:hover:bg-brand-800/50 transition-colors">Risk Assessment</Link>
                <Link href="/map" className="px-3 py-2 text-brand-900 dark:text-brand-100 rounded-md hover:bg-brand-100 dark:hover:bg-brand-800/50 transition-colors">Live Map</Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {children}
        </main>

        <footer className="border-t border-brand-200 dark:border-brand-900 bg-white/50 dark:bg-brand-950/50 backdrop-blur-sm text-brand-600 dark:text-brand-400 py-8 text-center text-sm mt-auto">
          <p className="flex items-center justify-center gap-1 font-medium">
            <Droplet className="w-4 h-4 opacity-50" />
            &copy; {new Date().getFullYear()} FloodGuard Inc. Making communities safer, smarter.
          </p>
        </footer>
      </body>
    </html>
  );
}
