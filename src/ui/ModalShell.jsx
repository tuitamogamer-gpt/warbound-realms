import { useEffect, useId, useRef } from 'react'

const FOCUSABLE = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Accessible foundation shared by every blocking game overlay. */
export default function ModalShell({
  children,
  className = '',
  overlayClassName = '',
  ariaLabel,
  onClose,
  closeOnBackdrop = false,
}) {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return undefined
    const previousFocus = document.activeElement
    const first = dialog.querySelector('[data-autofocus], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    first?.focus({ preventScroll: true })

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && onCloseRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = [...dialog.querySelectorAll(FOCUSABLE)]
      if (!focusable.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const firstItem = focusable[0]
      const lastItem = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  return (
    <div
      className={`overlay ${overlayClassName}`.trim()}
      onMouseDown={(event) => {
        if (closeOnBackdrop && onClose && event.currentTarget === event.target) onClose()
      }}
    >
      <div
        ref={dialogRef}
        className={`modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        tabIndex={-1}
      >
        {typeof children === 'function' ? children({ titleId }) : children}
      </div>
    </div>
  )
}
