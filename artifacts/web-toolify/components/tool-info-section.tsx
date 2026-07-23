interface Tip {
  icon: string
  title: string
  text: string
}

interface ToolInfoSectionProps {
  tips: Tip[]
}

/**
 * Renders a concise, useful "When to use" section below each tool.
 * Keeps content-to-ad ratio in balance and signals genuine value to crawlers.
 */
export function ToolInfoSection({ tips }: ToolInfoSectionProps) {
  return (
    <section
      className="mt-8 rounded-2xl border border-border bg-card p-5"
      aria-label="Usage tips"
    >
      <h2 className="text-sm font-semibold text-foreground mb-4">When to Use This Tool</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {tips.map((tip) => (
          <div key={tip.title} className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5 flex-shrink-0" aria-hidden="true">
              {tip.icon}
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{tip.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
