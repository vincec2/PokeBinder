import { Link } from "react-router";

type HomePageProps = {
  binderCount: number;
  lastActiveBinderId: string;
};

export function HomePage({ binderCount, lastActiveBinderId }: HomePageProps) {
  return (
    <main className="app-shell">
      <section className="home-hero">
        <p className="eyebrow">PokéBinder</p>
        <h1>Build and organize your Pokémon card binders.</h1>
        <p>
          Create visual 2x2 or 3x3 binder pages, add cards to slots, track card
          status, and save your prototype collection locally.
        </p>

        <div className="home-actions">
          <Link className="primary-button" to="/my-binders">
            View My Binders
          </Link>

          <Link className="secondary-link-button" to={`/binders/${lastActiveBinderId}`}>
            Continue Last Binder
          </Link>
        </div>

        <p className="home-note">
          You currently have {binderCount} local binder{binderCount === 1 ? "" : "s"}.
        </p>
      </section>
    </main>
  );
}