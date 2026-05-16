import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="app-shell">
      <section className="not-found-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>This page does not exist in the local prototype.</p>

        <Link className="primary-button" to="/">
          Go Home
        </Link>
      </section>
    </main>
  );
}