import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function FormField({
  id,
  label,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & {
  id: string
  label: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        className="h-9"
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}
