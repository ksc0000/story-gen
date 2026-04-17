interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

const steps = ["テーマ", "入力", "スタイル"];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className={`h-0.5 w-8 ${isDone ? "bg-amber-500" : "bg-gray-200"}`} />}
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${isActive ? "bg-amber-500 text-white" : isDone ? "bg-amber-200 text-amber-800" : "bg-gray-200 text-gray-400"}`}>{stepNum}</div>
              <span className={`mt-1 text-xs ${isActive ? "text-amber-700 font-medium" : "text-gray-400"}`}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
