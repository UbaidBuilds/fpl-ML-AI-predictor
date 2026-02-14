import Link from "next/link";
import { Sparkles, ArrowRight, Users, Crown, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-32 px-4">
        {/* Decorative glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00FF87]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/20 text-[#00FF87] text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            AI-Powered Predictions
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-white mb-6 leading-tight">
            Dominate Your
            <br />
            <span className="text-[#00FF87]">FPL League</span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Get AI predictions for every Premier League player. Make smarter transfers,
            pick the right captain, and climb the rankings.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#00FF87] text-[#0a0e1a] font-bold rounded-xl hover:bg-[#00e676] transition-colors text-lg"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/players"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-colors text-lg"
            >
              Browse Players
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="container mx-auto">
          <h2 className="text-3xl font-black text-white text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            Powerful tools to give you the edge in Fantasy Premier League
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <FeatureCard
              icon={Sparkles}
              title="AI Predictions"
              description="Get predicted points for every player, powered by machine learning trained on years of Premier League data."
            />
            <FeatureCard
              icon={Crown}
              title="Captain Picker"
              description="Never second-guess your captain choice again. See exactly who's predicted to score the most."
            />
            <FeatureCard
              icon={BarChart3}
              title="Player Comparison"
              description="Compare up to 4 players side by side. Stats, fixtures, and predictions all in one view."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-black text-white text-center mb-12">
            How It Works
          </h2>

          <div className="space-y-8">
            <Step number={1} title="Create Your Account" description="Sign up in seconds. It's free to get started." />
            <Step number={2} title="Connect Your FPL Team" description="Enter your FPL Team ID and we'll pull in your squad automatically." />
            <Step number={3} title="Get AI Insights" description="See predicted points, optimal lineups, captain picks, and transfer suggestions." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
            Ready to Climb the Rankings?
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Join managers already using AI predictions to make better FPL decisions.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#00FF87] text-[#0a0e1a] font-bold rounded-xl hover:bg-[#00e676] transition-colors text-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-bold text-[#00FF87]">FPL AI</span>
          <div className="flex gap-6 text-sm text-slate-500">
            <Link href="/players" className="hover:text-white transition-colors">Players</Link>
            <Link href="/fixtures" className="hover:text-white transition-colors">Fixtures</Link>
            <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl bg-[#111827] border border-white/5 hover:border-[#00FF87]/20 transition-colors card-glow">
      <div className="w-12 h-12 rounded-lg bg-[#00FF87]/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[#00FF87]" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-full bg-[#00FF87] text-[#0a0e1a] flex items-center justify-center font-black text-lg flex-shrink-0">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-slate-400">{description}</p>
      </div>
    </div>
  );
}
