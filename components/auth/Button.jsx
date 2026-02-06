export default function Button({ children, variant = "primary", type = "button", onClick, className = "", disabled = false }) {
  const variants = {
    primary: "bg-vo-purple hover:bg-vo-purple/90 text-white disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-vo-magenta hover:bg-vo-magenta/90 text-white disabled:opacity-50 disabled:cursor-not-allowed",
    outline: "bg-background border border-border hover:bg-muted text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`h-12 w-full rounded-md px-6 py-3 text-base font-medium transition-colors flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
