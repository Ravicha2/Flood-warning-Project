import { AlertTriangle, Info, ShieldAlert, ShieldCheck } from 'lucide-react';

interface RiskAlertProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export default function RiskAlert({ level, message }: RiskAlertProps) {
  const config = {
    low: {
      color: 'bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 border-emerald-300/50 dark:border-emerald-700/50 shadow-emerald-500/10',
      icon: <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />,
      label: 'Low Risk Area',
    },
    medium: {
      color: 'bg-amber-100/80 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 border-amber-300/50 dark:border-amber-700/50 shadow-amber-500/10',
      icon: <Info className="w-7 h-7 text-amber-600 dark:text-amber-400" />,
      label: 'Medium Risk Area',
    },
    high: {
      color: 'bg-orange-100/80 dark:bg-orange-900/40 text-orange-900 dark:text-orange-100 border-orange-300/50 dark:border-orange-700/50 shadow-orange-500/10',
      icon: <AlertTriangle className="w-7 h-7 text-orange-600 dark:text-orange-400" />,
      label: 'High Risk Warning',
    },
    critical: {
      color: 'bg-red-100/90 dark:bg-red-900/40 text-red-900 dark:text-red-100 border-red-400/50 dark:border-red-700/50 shadow-red-500/20',
      icon: <ShieldAlert className="w-7 h-7 text-red-600 dark:text-red-400 animate-pulse" />,
      label: 'Critical Alert Level',
    },
  };

  const current = config[level] || config.low;

  return (
    <div className={`flex items-start p-5 border backdrop-blur-md rounded-2xl ${current.color} shadow-lg transition-all hover-lift`}>
      <div className="flex-shrink-0 mr-4 mt-1 bg-white/50 dark:bg-black/20 p-2 rounded-xl border border-white/20 dark:border-white/5 shadow-inner">
        {current.icon}
      </div>
      <div>
        <h3 className="font-extrabold text-xl uppercase tracking-widest mb-1.5 opacity-90">{current.label}</h3>
        <p className="text-base opacity-95 leading-relaxed font-medium">{message}</p>
      </div>
    </div>
  );
}
