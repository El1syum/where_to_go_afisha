export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/50 py-8">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Куда сходить?. Все права защищены.</p>
      </div>
    </footer>
  );
}
