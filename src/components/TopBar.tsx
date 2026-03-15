import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const TopBar = () => {
  return (
    <header className="flex items-center justify-between border-b bg-card px-5 py-3">
      <div className="flex items-center gap-2">
        <img
          src="/images/logo.png"
          alt="VibeCloud"
          className="h-8 object-contain"
        />
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Cloud Generation
        </h1>

      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Exportar Terraform
        </Button>
      </div>
    </header>
  );
};

export default TopBar;