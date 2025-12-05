import { cn } from "@/lib/utils";

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
  barClassName?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "success" | "warning" | "danger";
}

const sizeClasses = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

const variantClasses = {
  default: "bg-gradient-to-r from-blue-500 to-blue-600",
  success: "bg-gradient-to-r from-green-500 to-green-600",
  warning: "bg-gradient-to-r from-yellow-500 to-yellow-600",
  danger: "bg-gradient-to-r from-red-500 to-red-600",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showLabel = true,
  animated = true,
  className,
  barClassName,
  size = "md",
  variant = "default",
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  const getVariant = () => {
    if (percentage >= 80) return "success";
    if (percentage >= 60) return "default";
    if (percentage >= 40) return "warning";
    return "danger";
  };

  const displayVariant = variant === "default" ? getVariant() : variant;

  return (
    <div className={cn("w-full space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-foreground">
            {label || "Progress"}
          </span>
          <span className="text-muted-foreground font-semibold">
            {Math.round(percentage)}%
          </span>
        </div>
      )}

      <div
        className={cn(
          "w-full bg-muted rounded-full overflow-hidden",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            variantClasses[displayVariant],
            sizeClasses[size],
            barClassName,
            animated && "transition-all duration-500 ease-out"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export interface RatingProgressProps {
  currentRating: number;
  targetRating?: number;
  totalReviews: number;
  animated?: boolean;
}

export function RatingProgress({
  currentRating,
  targetRating = 5,
  totalReviews,
  animated = true,
}: RatingProgressProps) {
  const percentage = (currentRating / targetRating) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold">{currentRating.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">out of {targetRating}</p>
        </div>
        <p className="text-sm text-muted-foreground">{totalReviews} reviews</p>
      </div>

      <ProgressBar
        value={currentRating}
        max={targetRating}
        showLabel={false}
        animated={animated}
        variant="default"
      />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-muted rounded">
          <p className="text-muted-foreground">Next Milestone</p>
          <p className="font-semibold">
            {(4.5 - currentRating).toFixed(2)} points away
          </p>
        </div>
        <div className="p-2 bg-muted rounded">
          <p className="text-muted-foreground">Perfect Score</p>
          <p className="font-semibold">
            {(5.0 - currentRating).toFixed(2)} points away
          </p>
        </div>
      </div>
    </div>
  );
}

export interface SkillProgressProps {
  skills: Array<{
    name: string;
    value: number;
    max?: number;
  }>;
  animated?: boolean;
}

export function SkillProgress({
  skills,
  animated = true,
}: SkillProgressProps) {
  return (
    <div className="space-y-4">
      {skills.map((skill, index) => (
        <div key={skill.name} className="animate-slideInUp" style={{ animationDelay: `${index * 0.1}s` }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-foreground">
              {skill.name}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              {skill.value}{skill.max ? `/${skill.max}` : ""}
            </span>
          </div>
          <ProgressBar
            value={skill.value}
            max={skill.max}
            showLabel={false}
            animated={animated}
          />
        </div>
      ))}
    </div>
  );
}
