export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            MedConnect India
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your AI-Powered Personal Health Records
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
