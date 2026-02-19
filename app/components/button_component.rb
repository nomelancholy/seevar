# frozen_string_literal: true

class ButtonComponent < ApplicationComponent
  attr_reader :variant, :size, :type, :href

  def initialize(variant: :primary, size: :md, type: :button, href: nil, **options)
    @variant = variant
    @size = size
    @type = type
    @href = href
    @options = options
  end

  def css_classes
    base = "inline-flex items-center justify-center font-semibold transition-all duration-300 rounded border cursor-pointer btn-structural"
    size_css = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-base", lg: "px-6 py-3 text-lg" }[size]
    variant_css = {
      primary: "bg-[var(--ledger-surface)] border-[var(--ledger-border)] text-[var(--text-main)] hover:border-[var(--accent-var)]",
      accent: "border-[var(--accent-var)] text-[var(--accent-var)] hover:bg-[var(--accent-var)] hover:text-[var(--ledger-bg)]",
      muted: "border-[var(--ledger-border)] text-[var(--text-muted)] hover:text-[var(--text-main)]"
    }[variant]
    [base, size_css, variant_css, @options[:class]].compact.join(" ")
  end

  def tag_options
    @options.except(:class).merge(class: css_classes)
  end
end
