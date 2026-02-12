export default function AuthBrand({ size = "large", variant = "primary" }) {
  const sizes = {
    large: {
      logo: "h-14 w-14 rounded-xl text-[32px]",
      text: "text-[32px]",
      gap: "gap-4"
    },
    medium: {
      logo: "h-11 w-11 rounded-[10px] text-[22px]",
      text: "text-xl",
      gap: "gap-3"
    },
    // Login mobile: 64x64px, radius 16, gap 12
    "mobile-login": {
      logo: "h-16 w-16 rounded-2xl text-[32px]",
      text: "text-2xl",
      gap: "gap-3"
    },
    // Registro mobile: 48x48px, radius 12, gap 8
    "mobile-register": {
      logo: "h-12 w-12 rounded-xl text-2xl",
      text: "text-xl",
      gap: "gap-2"
    }
  };

  const variants = {
    primary: {
      logo: "bg-white/10",
      text: "text-white"
    },
    secondary: {
      logo: "bg-white/10",
      text: "text-white"
    },
    "light-primary": {
      logo: "bg-vo-purple",
      text: "text-foreground",
      textLogo: "text-white"
    },
    "light-secondary": {
      logo: "bg-vo-magenta",
      text: "text-foreground",
      textLogo: "text-white"
    }
  };

  const s = sizes[size];
  const v = variants[variant];

  return (
    <div className={`flex flex-col items-center ${s.gap}`}>
      <div className={`${s.logo} ${v.logo} flex items-center justify-center font-bold ${v.textLogo || 'text-white'}`}>
        C
      </div>
      <div className={`${s.text} ${v.text} font-bold`}>
        ATS App
      </div>
    </div>
  );
}
