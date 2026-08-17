import { siteConfig } from "@/data/site.config";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 mt-20 border-t border-border/50">
      <div className="mx-auto max-w-content px-6 py-8 text-center">
        <p className="text-sm text-muted">
          &copy; Since {siteConfig.sinceYear} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
