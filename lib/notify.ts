import { toast } from "sonner"
import { playSound } from "@/hooks/use-sound"

export const notify = {
  success: (message: string, options?: any) => {
    playSound('success')
    toast.success(message, {
      duration: 4000,
      closeButton: true,
      ...options
    })
  },
  error: (message: string, options?: any) => {
    playSound('error')
    toast.error(message, {
      duration: 5000,
      closeButton: true,
      ...options
    })
  },
  info: (message: string, options?: any) => {
    playSound('info')
    toast.info(message, {
      duration: 4000,
      closeButton: true,
      ...options
    })
  },
  warning: (message: string, options?: any) => {
    playSound('info')
    toast.warning(message, {
      duration: 4500,
      closeButton: true,
      ...options
    })
  },
  loading: (message: string, options?: any) => {
    return toast.loading(message, {
      ...options
    })
  },
  dismiss: (toastId?: string | number) => {
    toast.dismiss(toastId)
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
    options?: any
  ) => {
    return toast.promise(promise, messages, {
      ...options
    })
  }
}
