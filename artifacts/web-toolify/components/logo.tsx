import Image from 'next/image'

type LogoProps = {
  className?: string
  labelClassName?: string
}

export function Logo({ className = '', labelClassName = '' }: LogoProps) {
  return (
    <span className={`flex min-w-0 items-center gap-2 overflow-hidden ${className}`}>
      <Image
        src="/toolifypdf-logo.png"
        alt="ToolifyPDF logo"
        width={1350}
        height={1165}
        sizes="(max-width: 639px) 24px, 28px"
        className="h-auto w-6 shrink-0 object-contain sm:w-7"
      />
      <span
        className={`truncate text-lg font-bold text-foreground sm:text-xl ${labelClassName}`}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        ToolifyPDF
      </span>
    </span>
  )
}