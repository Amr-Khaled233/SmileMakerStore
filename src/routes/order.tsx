import { createFileRoute, redirect } from "@tanstack/react-router";

// The old catalog-style order page has been replaced by the cart + checkout
// flow. Keep this route as a redirect so old links/bookmarks/sitemap entries
// still resolve.
export const Route = createFileRoute("/order")({
  beforeLoad: () => {
    throw redirect({ to: "/products" });
  },
  component: () => null,
});
