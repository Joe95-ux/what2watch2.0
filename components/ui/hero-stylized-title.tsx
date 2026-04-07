type HeroStylizedTitleVariant = "default" | "detail";

const TITLE_VARIANT_STYLES: Record<
  HeroStylizedTitleVariant,
  { h1: string; span: string }
> = {
  default: {
    h1: "text-4xl md:text-5xl lg:text-[5rem] font-normal font-serif text-white drop-shadow-lg leading-[0.95]",
    span:
      "inline-block uppercase text-4xl md:text-5xl lg:text-[5rem] font-normal font-serif leading-[0.95]",
  },
  detail: {
    h1: "text-2xl sm:text-3xl md:text-[3.5rem] font-normal font-serif text-white drop-shadow-lg leading-[0.95]",
    span:
      "inline-block uppercase text-2xl sm:text-3xl md:text-[3.5rem] font-normal font-serif leading-[0.95]",
  },
};

interface HeroStylizedTitleProps {
  title: string;
  className?: string;
  /** `detail`: sheet/banner titles; max 3.5rem with explicit span sizes (required for overrides). */
  variant?: HeroStylizedTitleVariant;
}

export function HeroStylizedTitle({
  title,
  className,
  variant = "default",
}: HeroStylizedTitleProps) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const typo = TITLE_VARIANT_STYLES[variant];

  return (
    <h1
      className={[typo.h1, className ?? ""].join(" ")}
      aria-label={title}
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className={[
            typo.span,
            index % 2 === 0 ? "tracking-[0.08em]" : "tracking-[0.14em]",
            index === 0 ? "mr-2" : "mr-2",
          ].join(" ")}
        >
          {word}
        </span>
      ))}
    </h1>
  );
}

