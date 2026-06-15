"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, User, Info } from "lucide-react";
import type { BookDoc, PageDoc, StoryCharacter } from "@/lib/types";
import type { QualityReviewWithId } from "@/lib/quality-review";
import { formatQualityScore, CHARACTER_AXIS_WEIGHTS } from "@/lib/quality-review";

interface CharacterConsistencyDiagnosticsProps {
  book: BookDoc & { id: string };
  pages: PageDoc[];
  qualityReviews: QualityReviewWithId[];
}

const AXIS_LABELS: Record<string, string> = {
  visualBibleReflected: "Visual Bible Reflected",
  characterIdConsistency: "Character ID Consistency",
  appearingCharacterConsistency: "Appearing Characters",
  focusCharacterConsistency: "Focus Character",
  pageLevelCharacterLinkage: "Page Linkage",
  outfitHairstyleConsistency: "Outfit/Hairstyle",
  colorPaletteConsistency: "Color Palette",
};

export function CharacterConsistencyDiagnostics({
  book,
  pages,
  qualityReviews,
}: CharacterConsistencyDiagnosticsProps) {
  const latestLLMReview = qualityReviews.find((r) => r.reviewerType === "llm");
  const charAxes = latestLLMReview?.characterAxes;

  const characters = book.storyCast || [];

  // Helper to check character presence in prompt (sync with functions/src/lib/prompt-analyzer.ts)
  const isCharacterInPrompt = (prompt: string, char: StoryCharacter) => {
    const p = prompt.toLowerCase();
    const name = char.displayName.toLowerCase();
    const id = char.characterId.toLowerCase();
    const role = char.role.toLowerCase();

    if (p.includes(name) || p.includes(id) || p.includes(role)) return true;

    // Protagonist specific fallbacks
    if (id === "child_protagonist" || role === "protagonist") {
      if (p.includes("child") || p.includes("main character")) return true;
    }

    return false;
  };

  return (
    <Card id="character-diagnostics" className="border-indigo-200">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
            <User size={20} className="text-indigo-600" />
            Character Consistency Diagnostics
          </h3>
          {latestLLMReview && (
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              LLM Score: {formatQualityScore(latestLLMReview.characterConsistencyScore)}
            </Badge>
          )}
        </div>

        {/* LLM Axes Breakdown */}
        {charAxes && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(AXIS_LABELS).map(([key, label]) => {
              const score = (charAxes as unknown as Record<string, number>)[key]; // This is 1-5
              const weight = (CHARACTER_AXIS_WEIGHTS as Record<string, number>)[key];
              // Map 1-5 to 0-100 for visualization if needed, but let's show 1-5
              return (
                <div key={key} className="rounded-lg border border-indigo-100 bg-white p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-indigo-500 uppercase">{label}</span>
                    <span className="text-[10px] text-indigo-300">w:{weight}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className={`text-lg font-bold ${score >= 4 ? "text-emerald-600" : score >= 3 ? "text-amber-600" : "text-rose-600"}`}>
                      {score ?? "—"}
                    </span>
                    <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-amber-500" : "bg-rose-500"}`}
                        style={{ width: `${(score / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Character Presence Matrix */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
            Character Presence Matrix
            <Info size={14} className="text-indigo-400" aria-label="Checks if characters appearing in text are mentioned in the prompt" />
          </h4>
          <div className="overflow-x-auto rounded-xl border border-indigo-50">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-indigo-50/50 text-left text-xs font-semibold text-indigo-700">
                  <th className="px-4 py-2 border-b border-indigo-100">Page</th>
                  {characters.map((char) => (
                    <th key={char.characterId} className="px-4 py-2 border-b border-indigo-100 text-center min-w-[100px]">
                      {char.displayName}
                      <p className="text-[9px] font-normal opacity-70">{char.role}</p>
                    </th>
                  ))}
                  <th className="px-4 py-2 border-b border-indigo-100 text-center">Ref used</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.pageNumber} className="border-b border-indigo-50 hover:bg-indigo-50/20">
                    <td className="px-4 py-3 font-medium text-indigo-900">P{page.pageNumber + 1}</td>
                    {characters.map((char) => {
                      const isExpected = page.appearingCharacterIds?.includes(char.characterId);
                      const isFocus = page.focusCharacterId === char.characterId;
                      const inPrompt = isCharacterInPrompt(page.imagePrompt || "", char);

                      return (
                        <td key={char.characterId} className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {isExpected ? (
                              <div className="flex items-center gap-1">
                                {inPrompt ? (
                                  <CheckCircle2 size={16} className="text-emerald-500" aria-label="Present in prompt" />
                                ) : (
                                  <XCircle size={16} className="text-rose-500" aria-label="Missing from prompt!" />
                                )}
                                {isFocus && <Badge className="h-4 px-1 text-[8px] bg-indigo-600">Focus</Badge>}
                              </div>
                            ) : (
                              inPrompt ? (
                                <AlertCircle size={16} className="text-amber-400" aria-label="In prompt but not in appearing list" />
                              ) : (
                                <span className="text-slate-200">—</span>
                              )
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      {page.usedCharacterReference ? (
                        <CheckCircle2 size={16} className="text-indigo-500 mx-auto" />
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-4 text-[10px] text-slate-500">
             <div className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> Expected & In Prompt</div>
             <div className="flex items-center gap-1"><XCircle size={12} className="text-rose-500" /> Missing from Prompt</div>
             <div className="flex items-center gap-1"><AlertCircle size={12} className="text-amber-400" /> In Prompt (Unexpected)</div>
          </div>
        </div>

        {/* Flagged Issues Section */}
        {latestLLMReview && latestLLMReview.flaggedIssues.some(i => i.area === 'character') && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-rose-700">Flagged Character Issues</h4>
            <ul className="space-y-1">
              {latestLLMReview.flaggedIssues
                .filter(i => i.area === 'character')
                .map((issue, i) => (
                  <li key={i} className="rounded-lg bg-rose-50 border border-rose-100 p-2 text-xs text-rose-800 flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">[{issue.severity}]</span> {issue.message}
                      {issue.pageNumber && <span className="ml-2 opacity-70">(Page {issue.pageNumber})</span>}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
