import {useCallback, useState} from 'react'

export type CredentialStatus = 'idle' | 'loading' | 'success' | 'error'

export function useCredentialState<T>(initialData: T | null = null) {
  const [data, setData] = useState<T | null>(initialData)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<CredentialStatus>('idle')

  const updateData = useCallback((newData: T) => {
    setData(newData)
    setStatus('success')
    setError(null)
    setIsLoading(false)
  }, [])

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading)
    setStatus(loading ? 'loading' : 'idle')
  }, [])

  const setErrorState = useCallback((errorMessage: string) => {
    setError(errorMessage)
    setStatus('error')
    setIsLoading(false)
  }, [])

  const reset = useCallback(() => {
    setData(null)
    setIsLoading(true)
    setError(null)
    setStatus('idle')
  }, [])

  return {
    data,
    isLoading,
    error,
    status,
    updateData,
    setLoading,
    setErrorState,
    reset,
  }
}
