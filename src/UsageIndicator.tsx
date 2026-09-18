import { useState } from "react";
import { Zap } from "lucide-react";

type UsageIndicatorProps = {
  tokensUsed: number;
  tokensLimit: number;
};

export default function UsageIndicator({ tokensUsed, tokensLimit }: UsageIndicatorProps) {
  const [hovered, setHovered] = useState(false);
  const percentUsed = Math.min(100, Math.round((tokensUsed / tokensLimit) * 100));
  const isNearLimit = percentUsed >= 80;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        className={`p-1.5 rounded-lg transition-colors ${
          isNearLimit ? "text-rose-500 hover:bg-rose-50" : "text-stone-400 hover:bg-stone-100"
        }`}
      >
        <Zap size={16} fill={isNearLimit ? "currentColor" : "none"} />
      </button>

      {hovered && (
        <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-stone-200 rounded-xl shadow-lg p-3 z-50">
          <p className="text-xs font-medium text-stone-700 mb-1">Usage this window</p>
          <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all ${
                isNearLimit ? "bg-rose-500" : "bg-stone-800"
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <p className="text-xs text-stone-500">
            {tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()} tokens
          </p>
          <p className="text-[11px] text-stone-400 mt-1">
            Resets a few hours after your first message in a window.
          </p>
        </div>
      )}
    </div>
  );
}