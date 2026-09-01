import { init } from '@nimiq/mini-app-sdk'

let clientPromise: ReturnType<typeof init> | undefined

export async function getNimiqClient() {
  clientPromise ??= init({ timeout: 15_000 })
  try {
    return await clientPromise
  } catch (error) {
    clientPromise = undefined
    throw error
  }
}
