import crypto from "crypto"

const YOOMONEY_WALLET_ID = process.env.YOOMONEY_WALLET_ID!
const YOOMONEY_SECRET = process.env.YOOMONEY_SECRET!

export interface CreateYooMoneyPaymentParams {
  amount: number
  comment: string
  orderId: string
}

export interface YooMoneyPaymentResult {
  url: string
}

export function createYooMoneyPayment(
  amount: number,
  comment: string,
  orderId: string
): YooMoneyPaymentResult {
  if (amount < 10 || amount > 60000) {
    throw new Error("Amount must be between 10 and 60000")
  }

  const adjustedAmount = Math.round((amount / 0.9691) * 100) / 100

  const paymentUrl = 
    `https://yoomoney.ru/quickpay/confirm.xml` +
    `?receiver=${YOOMONEY_WALLET_ID}` +
    `&formcomment=${encodeURIComponent(comment)}` +
    `&short-dest=${encodeURIComponent(comment)}` +
    `&label=${orderId}` +
    `&quickpay-form=shop` +
    `&targets=${encodeURIComponent(comment)}` +
    `&sum=${adjustedAmount}` +
    `&paymentType=AC`

  return { url: paymentUrl }
}

export interface YooMoneyWebhookPayload {
  notification_type?: string
  operation_id?: string
  amount?: string
  currency?: string
  datetime?: string
  sender?: string
  codepro?: string
  label?: string
  sha1_hash?: string
}

export function validateYooMoneyNotification(data: YooMoneyWebhookPayload): boolean {
  const sha1Hash = data.sha1_hash
  if (!sha1Hash) return false

  const expectedHash = crypto
    .createHash("sha1")
    .update(
      `${data.notification_type}&` +
      `${data.operation_id}&` +
      `${data.amount}&` +
      `${data.currency}&` +
      `${data.datetime}&` +
      `${data.sender}&` +
      `${data.codepro}&` +
      `${YOOMONEY_SECRET}&` +
      `${data.label}`,
      "utf8"
    )
    .digest("hex")

  return sha1Hash === expectedHash
}