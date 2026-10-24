import { cn } from "cn"

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-7 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path
        d="M10 8h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-6l-4.6 3.6a.5.5 0 0 1-.8-.4V21H10a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3z"
        className="fill-primary-foreground"
      />
      <circle cx="12.5" cy="14.5" r="1.5" className="fill-primary" />
      <circle cx="16" cy="14.5" r="1.5" className="fill-primary" />
      <circle cx="19.5" cy="14.5" r="1.5" className="fill-highlight" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 text-[15px] font-semibold tracking-tight",
        className,
      )}
    >
      <LogoMark />
      Mpanampy
    </span>
  )
}
