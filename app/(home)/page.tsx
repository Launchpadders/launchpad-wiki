import { DottedBackground } from "../components/DottedBackground";

export default function HomePage() {
  return (
    <div className="relative flex flex-col justify-center text-center flex-1">
      <DottedBackground />
      <div className="relative z-10 px-6">
        <h1 className="text-3xl font-bold mb-4">Launchpad Wiki</h1>
        <p className="max-w-xl mx-auto text-muted-foreground">
          A community-driven resource for Novation Launchpad players and creators. From playing
          lightshows to building your own projects and making music, this wiki helps you get
          started and level up.
        </p>
        <div className="mt-8">
          <a
            href="/docs/play"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold bg-fd-info transition"
            aria-label="Go to Play documentation"
          >
            Get started
          </a>
        </div>
      </div>
    </div>
  );
}
