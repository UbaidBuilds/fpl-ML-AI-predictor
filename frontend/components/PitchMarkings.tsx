export function PitchMarkings() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Outer border */}
      <div className="absolute inset-3 border border-white/15 rounded-lg" />
      {/* Center line */}
      <div className="absolute top-1/2 left-3 right-3 h-px bg-white/15" />
      {/* Center circle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-white/15" />
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/15" />
      {/* Top penalty area */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-40 sm:w-52 h-16 sm:h-20 border-b border-l border-r border-white/15 rounded-b-lg" />
      {/* Bottom penalty area */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-40 sm:w-52 h-16 sm:h-20 border-t border-l border-r border-white/15 rounded-t-lg" />
    </div>
  );
}
