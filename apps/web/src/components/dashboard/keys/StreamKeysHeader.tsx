export function StreamKeysHeader() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Stream Keys</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your streaming ingress configuration
        </p>
      </div>
    </div>
  );
}
