'use client'

import { Toaster, useToast } from './Toaster'

export function ToasterWrapper() {
  const { toasts, removeToast } = useToast()

  return <Toaster toasts={toasts} onRemove={removeToast} />
}
