import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { id: String }

  connect() {
    this.content = document.getElementById(`${this.idValue}-content`)
    this.arrow = document.getElementById(`${this.idValue}-arrow`)
  }

  toggle() {
    if (!this.content || !this.arrow) return
    this.content.classList.toggle("open")
    this.arrow.classList.toggle("open")
  }
}
