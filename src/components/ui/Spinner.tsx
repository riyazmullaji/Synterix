import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin",
        className
      )}
    />
  );
}

export function PageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-gray-500">
      <Spinner className="w-6 h-6" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}
