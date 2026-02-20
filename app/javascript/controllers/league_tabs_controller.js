import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["tab", "panel"]

  connect() {
    this.show(0)
  }

  switch(event) {
    const index = this.tabTargets.indexOf(event.currentTarget)
    if (index === -1) return
    this.tabTargets.forEach((t, i) => t.classList.toggle("active", i === index))
    this.panelTargets.forEach((p, i) => p.classList.toggle("hidden", i !== index))
  }
}
