interface ArchitectureAnalysisPanelProps {
  analysis: string;
}

export default function ArchitectureAnalysisPanel({
  analysis,
}: ArchitectureAnalysisPanelProps) {
  if (!analysis) return null;

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-foreground">
        Análise de entrada
      </h4>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
        {analysis}
      </p>
    </div>
  );
}
