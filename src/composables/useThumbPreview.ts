import { ref } from 'vue'

// Must match the max box in .thumb-full so the clamp below is accurate.
const MAX_W = 420
const MAX_H = 540
const GAP = 8
const MARGIN = 8

/**
 * Floating full-size preview shown while the pointer is over a thumbnail.
 *
 * Shared by the single thumbnails in the table cells and the strips inside an
 * expanded row, so both place the preview the same way: beside the thumbnail,
 * flipped to its left when there is no room on the right, and clamped to the
 * viewport on both axes. Combined with `position: fixed` that keeps the preview
 * fully visible and stops it extending the document, which used to add a
 * scrollbar when hovering rows near the bottom of the page.
 */
export function useThumbPreview() {
  const open = ref(false)
  const src = ref<string | undefined>(undefined)
  const pos = ref({ left: '0px', top: '0px' })

  function show(el: HTMLElement | null | undefined, url?: string) {
    if (!el || !url) return

    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = rect.right + GAP
    if (left + MAX_W + MARGIN > vw) left = rect.left - MAX_W - GAP
    left = Math.max(MARGIN, Math.min(left, vw - MAX_W - MARGIN))

    const top = Math.max(MARGIN, Math.min(rect.top, vh - MAX_H - MARGIN))

    pos.value = { left: `${left}px`, top: `${top}px` }
    src.value = url
    open.value = true
  }

  function hide() {
    open.value = false
  }

  return { open, src, pos, show, hide }
}
