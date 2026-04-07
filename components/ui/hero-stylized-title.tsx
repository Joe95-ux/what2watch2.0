interface HeroStylizedTitleProps {
  title: string;
  className?: string;
}

export function HeroStylizedTitle({ title, className }: HeroStylizedTitleProps) {
  const words = title.trim().split(/\s+/).filter(Boolean);

  return (
    <h1
      className={[
        "text-4xl md:text-5xl lg:text-[5rem] font-normal font-serif text-white drop-shadow-lg leading-[0.95]",
        className ?? "",
      ].join(" ")}
      aria-label={title}
    >
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className={[
            "inline-block uppercase text-4xl md:text-5xl lg:text-[5rem] font-inherit leading-inherit",
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

