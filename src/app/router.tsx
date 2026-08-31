import type { ReactNode } from 'react'

export interface AppRoute {
  path: string
  element: ReactNode
}

/** Route definitions live here once a router is introduced. */
export const routes: AppRoute[] = []
