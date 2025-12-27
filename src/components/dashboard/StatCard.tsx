import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

const StatCard = ({ title, value, icon: Icon, trend, variant = 'default' }: StatCardProps) => {
  const variants = {
    default: 'bg-card',
    primary: 'bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20',
    success: 'bg-gradient-to-br from-success/20 to-success/5 border-success/20',
    warning: 'bg-gradient-to-br from-warning/20 to-warning/5 border-warning/20',
  };

  const iconVariants = {
    default: 'bg-secondary text-foreground',
    primary: 'bg-primary/20 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
  };

  return (
    <div className={cn(
      "rounded-xl border p-6 transition-all duration-300 hover:shadow-card animate-fade-in",
      variants[variant]
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-display font-bold">{value}</p>
          {trend && (
            <p className={cn(
              "text-sm font-medium",
              trend.value >= 0 ? "text-success" : "text-destructive"
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          iconVariants[variant]
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
