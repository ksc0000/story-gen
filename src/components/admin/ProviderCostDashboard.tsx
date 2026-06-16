import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProviderCostMetrics } from "@/lib/admin-cost-metrics";

interface ProviderCostDashboardProps {
  metrics: ProviderCostMetrics;
  loading?: boolean;
}

export function ProviderCostDashboard({ metrics, loading }: ProviderCostDashboardProps) {
  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-violet-500">
        コストデータを計算中...
      </div>
    );
  }

  if (metrics.totalBooks === 0) {
    return (
      <div className="py-8 text-center text-sm text-violet-400">
        表示するコストデータがありません。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <CostStatCard
          label="Total Estimated Cost"
          value={`$${metrics.totalCostUsd.toFixed(2)}`}
          hint={`${metrics.totalImages} images`}
        />
        <CostStatCard
          label="Avg Cost per Book"
          value={`$${metrics.avgCostPerBook.toFixed(2)}`}
          hint="Estimated"
        />
        <CostStatCard
          label="Total Books"
          value={metrics.totalBooks}
          hint="Terminal status only"
        />
        <CostStatCard
          label="Total Images"
          value={metrics.totalImages}
          hint="Pages + Covers"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Object.entries(metrics.providers).map(([providerId, stats]) => (
          <Card key={providerId} className="border-violet-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold capitalize text-purple-900">
                  {providerId}
                </h4>
                <div className="text-right">
                  <p className="text-xl font-bold text-purple-950">
                    ${stats.costUsd.toFixed(3)}
                  </p>
                  <p className="text-xs text-violet-500">
                    {stats.imageCount} images ({( (stats.costUsd / metrics.totalCostUsd) * 100 ).toFixed(1)}%)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">
                  Model Breakdown
                </p>
                <div className="divide-y divide-violet-50">
                  {Object.entries(stats.models)
                    .sort((a, b) => b[1].costUsd - a[1].costUsd)
                    .map(([model, modelStats]) => (
                      <div key={model} className="flex items-center justify-between py-2 text-sm">
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="truncate font-medium text-violet-900" title={model}>
                            {model}
                          </p>
                          <p className="text-xs text-violet-500">
                            {modelStats.imageCount} images
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-purple-900">
                            ${modelStats.costUsd.toFixed(3)}
                          </p>
                          <p className="text-[10px] text-violet-400">
                            avg ${(modelStats.costUsd / modelStats.imageCount).toFixed(3)}/img
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CostStatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="bg-white/50">
      <CardContent className="p-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-violet-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-purple-950">{value}</p>
        {hint && <p className="text-xs text-violet-400">{hint}</p>}
      </CardContent>
    </Card>
  );
}
