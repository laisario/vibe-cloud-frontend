const LoadingDots = () => (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse-dot"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </div>
  );
  
  export default LoadingDots;
  