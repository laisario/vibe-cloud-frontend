interface SuggestionChipsProps {
    onSelect: (text: string) => void;
  }
  
  const suggestions = [
    "Descrever uma arquitetura web escalável",
    "Gerar Terraform para um app de microsserviços",
    "Analisar minha arquitetura existente",
  ];
  
  const SuggestionChips = ({ onSelect }: SuggestionChipsProps) => {
    return (
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelect(s)}
            className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    );
  };
  
  export default SuggestionChips;
  