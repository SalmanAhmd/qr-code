/** Scrolls to a section and moves focus to it so keyboard users follow the jump. */
export function scrollToSection(sectionId: string): void {
  const section = document.getElementById(sectionId)
  if (!section) return

  section.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const focusTarget = section.querySelector<HTMLElement>('[data-section-focus]') ?? section
  focusTarget.setAttribute('tabindex', '-1')
  focusTarget.focus({ preventScroll: true })
}
