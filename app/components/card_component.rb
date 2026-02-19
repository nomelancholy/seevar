# frozen_string_literal: true

class CardComponent < ApplicationComponent
  def initialize(extra_css: nil, **options)
    @extra_css = extra_css
    @options = options
  end

  def css_classes
    base = "ledger-surface p-4 rounded"
    [base, @extra_css, @options[:class]].compact.join(" ")
  end

  def tag_options
    @options.except(:class).merge(class: css_classes)
  end
end
