import {useEffect, useRef} from 'react'
import {useQueryClient} from '@tanstack/react-query'

export function usePolling<T>(
  id: string,
  localState: T | null,
  finalStates: string[],
  queryKey: string,
  interval: number = 5000,
) {
  const queryClient = useQueryClient()
  const pollingIntervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const shouldPoll =
      (localState && !finalStates.includes((localState as any).status)) ||
      (id && !localState)

    if (shouldPoll) {
      pollingIntervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({queryKey: [queryKey, id]})
      }, interval)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [localState, id, queryClient, queryKey, interval, finalStates])
}
