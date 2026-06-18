import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { QualityComparisonMetrics } from "@/lib/admin-quality-comparison";

interface Props {
  metrics: QualityComparisonMetrics;
}

export const QualityComparisonDashboard: React.FC<Props> = ({ metrics }) => {
  const axes = [
    { key: "overallScore", label: "Overall" },
    { key: "storyScore", label: "Story" },
    { key: "illustrationScore", label: "Illustration" },
    { key: "characterConsistencyScore", label: "Character" },
    { key: "personalizationScore", label: "Personal." },
    { key: "safetyScore", label: "Safety" },
  ];

  const issueAreas = [
    { key: "story", label: "Story Issues" },
    { key: "illustration", label: "Illust. Issues" },
    { key: "character", label: "Char. Issues" },
    { key: "personalization", label: "Pers. Issues" },
    { key: "safety", label: "Safety Issues" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white p-4 border border-violet-100">
        <h4 className="text-sm font-semibold text-violet-900 mb-3">
          Human vs. LLM Score Agreement (Matched Pairs: {metrics.matchedPairs})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-violet-100 text-violet-500 uppercase tracking-wider">
                <th className="py-2 pr-4">Axis</th>
                <th className="py-2 pr-4 text-center">MAE (Lower is Better)</th>
                <th className="py-2 pr-4 text-center">Bias (LLM - Human)</th>
              </tr>
            </thead>
            <tbody>
              {axes.map((axis) => {
                const m = metrics.metrics[axis.key];
                if (!m) return null;
                const biasColor = m.bias > 0.3 ? "text-amber-600" : m.bias < -0.3 ? "text-rose-600" : "text-violet-700";
                return (
                  <tr key={axis.key} className="border-b border-violet-50 hover:bg-violet-50/30">
                    <td className="py-2 pr-4 font-medium text-violet-900">{axis.label}</td>
                    <td className="py-2 pr-4 text-center text-violet-700">{m.mae.toFixed(2)}</td>
                    <td className={`py-2 pr-4 text-center font-medium ${biasColor}`}>
                      {m.bias > 0 ? "+" : ""}{m.bias.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[10px] text-violet-400">
          MAE: Mean Absolute Error. Bias: Positive means LLM scores higher than human.
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 border border-violet-100">
        <h4 className="text-sm font-semibold text-violet-900 mb-3">
          Issue Detection Agreement (Confusion Matrix)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-violet-100 text-violet-500 uppercase tracking-wider">
                <th className="py-2 pr-4">Area</th>
                <th className="py-2 pr-4 text-center">TP</th>
                <th className="py-2 pr-4 text-center">FP</th>
                <th className="py-2 pr-4 text-center">FN</th>
                <th className="py-2 pr-4 text-center">Precision</th>
                <th className="py-2 pr-4 text-center">Recall</th>
              </tr>
            </thead>
            <tbody>
              {issueAreas.map((area) => {
                const cm = metrics.confusionMatrix[area.key];
                if (!cm) return null;
                return (
                  <tr key={area.key} className="border-b border-violet-50 hover:bg-violet-50/30">
                    <td className="py-2 pr-4 font-medium text-violet-900">{area.label}</td>
                    <td className="py-2 pr-4 text-center text-violet-700">{cm.tp}</td>
                    <td className="py-2 pr-4 text-center text-violet-700">{cm.fp}</td>
                    <td className="py-2 pr-4 text-center text-violet-700">{cm.fn}</td>
                    <td className="py-2 pr-4 text-center font-medium text-indigo-700">
                      {(cm.precision * 100).toFixed(0)}%
                    </td>
                    <td className="py-2 pr-4 text-center font-medium text-indigo-700">
                      {(cm.recall * 100).toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-violet-400">
          <p>TP: Both flagged. FP: LLM only. FN: Human only.</p>
          <p>Precision: Reliability of LLM flags. Recall: Capture rate of human-identified issues.</p>
        </div>
      </div>
    </div>
  );
};
