import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, ...props }, ref) => {
    if (startIcon || endIcon) {
      return (
        <div className="relative flex items-center">
          {startIcon && (
            <span className="absolute left-3 flex items-center text-muted-foreground pointer-events-none">
              {startIcon}
            </span>
          )}
          <input
            type={type}
            className={cn(
              'flex h-9 w-full rounded-lg border border-input bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
              startIcon ? 'pl-9' : 'px-3',
              endIcon ? 'pr-9' : 'pr-3',
              'py-2',
              className,
            )}
            ref={ref}
            {...props}
          />
          {endIcon && (
            <span className="absolute right-3 flex items-center text-muted-foreground">
              {endIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
