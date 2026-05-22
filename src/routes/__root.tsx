import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-elegant"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ClassMind — AI Teaching Assistant" },
      { name: "description", content: "Auto-generate lecture summaries, quizzes, attendance and analytics with AI." },
      { property: "og:title", content: "ClassMind — AI Teaching Assistant" },
      { name: "twitter:title", content: "ClassMind — AI Teaching Assistant" },
      { property: "og:description", content: "Auto-generate lecture summaries, quizzes, attendance and analytics with AI." },
      { name: "twitter:description", content: "Auto-generate lecture summaries, quizzes, attendance and analytics with AI." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/75e3288e-6278-45a8-979a-663f08b39241/id-preview-2b8df2cd--ec996f09-8d39-415a-b0d3-328f159b5311.lovable.app-1778858219338.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/75e3288e-6278-45a8-979a-663f08b39241/id-preview-2b8df2cd--ec996f09-8d39-415a-b0d3-328f159b5311.lovable.app-1778858219338.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <>
      <AppShell>
        <Outlet />
      </AppShell>
      <Toaster richColors position="top-right" />
    </>
  );
}
