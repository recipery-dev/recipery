import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
});

const title = "Recipery";
const description = "Your self-hosted recipe library.";
// Only affects absolute URLs in OG/Twitter tags (link-preview images, etc.)
// — the app itself works fine without this being set. Defaults to the
// public demo's domain; self-hosters can override to get correct previews
// for their own instance.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://recipery.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Child routes just set a plain `title: "X"` and get "X - Recipery" for
  // free — Next applies this template on every navigation (including
  // client-side ones), which a manual document.title effect can't reliably
  // win against since the router re-asserts the resolved metadata title
  // after each transition.
  title: { default: title, template: `%s - ${title}` },
  description,
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: title,
    images: [{ url: "/logo.png", width: 1254, height: 1254, alt: title }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/logo.png"],
  },
};

// Tints the mobile browser chrome (address bar) to match the app's own
// light/dark background — separate from manifest.ts's theme_color, which
// only applies to the installed PWA's splash screen and window frame.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#16140f" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const htmlClassName = themeCookie === "dark" ? "dark" : undefined;

  return (
    <html
      lang="en"
      className={htmlClassName}
      style={themeCookie === "dark" || themeCookie === "light" ? { colorScheme: themeCookie } : undefined}
      suppressHydrationWarning
    >
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          scriptProps={{ "data-cfasync": "false" }}
        >
          <TooltipProvider delay={200}>
            <Toaster>{children}</Toaster>
          </TooltipProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
