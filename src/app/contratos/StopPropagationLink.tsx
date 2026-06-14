"use client";

type Props = { href: string; className?: string; children: React.ReactNode };

export function StopPropagationLink({ href, className, children }: Props) {
  return (
    <a href={href} className={className} onClick={(e) => e.stopPropagation()}>
      {children}
    </a>
  );
}
