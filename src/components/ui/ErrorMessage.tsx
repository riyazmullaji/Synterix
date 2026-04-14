interface ErrorMessageProps {
  error: Error | string | null | undefined;
  title?: string;
}

export function ErrorMessage({ error, title = "Something went wrong" }: ErrorMessageProps) {
  if (!error) return null;
  const message = typeof error === "string" ? error : error.message;
  return (
    <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p className="font-medium">{title}</p>
      <p className="mt-0.5 text-red-600">{message}</p>
    </div>
  );
}
