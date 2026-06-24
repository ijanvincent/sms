export function PageContainer({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>;
}
