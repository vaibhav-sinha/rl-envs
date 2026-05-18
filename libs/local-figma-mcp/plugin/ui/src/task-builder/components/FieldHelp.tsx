import { Label } from '../../components/ui/label';
import { cn } from '../../lib/utils';

export function FieldHelp({
  label,
  description,
  htmlFor,
  className,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-0.5', className)}>
      <Label htmlFor={htmlFor} className="text-[11px] text-foreground">
        {label}
      </Label>
      {description ? <p className="text-[10px] text-muted m-0 leading-snug">{description}</p> : null}
    </div>
  );
}
