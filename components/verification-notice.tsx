"use client"

import { AlertCircle, Mail } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface VerificationNoticeProps {
  show: boolean
  message?: string
}

export function VerificationNotice({ show, message }: VerificationNoticeProps) {
  if (!show) return null

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Требуется верификация email</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>
          {message || 'Для совершения покупок необходимо подтвердить ваш email адрес.'}
        </p>
        <p className="text-sm">
          Проверьте почту или обратитесь в поддержку для подтверждения аккаунта.
        </p>
      </AlertDescription>
    </Alert>
  )
}
