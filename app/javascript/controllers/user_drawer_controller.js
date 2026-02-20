import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["overlay", "drawer"]

  toggle() {
    const isOpen = !this.overlayTarget.classList.contains("hidden")
    if (isOpen) {
      this.drawerTarget.classList.add("translate-x-full")
      setTimeout(() => this.overlayTarget.classList.add("hidden"), 300)
    } else {
      this.overlayTarget.classList.remove("hidden")
      requestAnimationFrame(() => this.drawerTarget.classList.remove("translate-x-full"))
    }
  }

  closeOnOverlay(event) {
    if (event.target === this.overlayTarget) this.toggle()
  }
}
