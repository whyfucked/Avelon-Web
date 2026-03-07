import crypto from "crypto"

const MERCHANT_UUID = process.env.HELEKET_MERCHANT_ID!
const PAYMENT_KEY = process.env.HELEKET_SECRET_KEY!
const API_URL = "https://api.heleket.com/"

function generateSign(body: string): string {
  const base64Body = Buffer.from(body).toString("base64")
  return crypto.createHash("md5").update(base64Body + PAYMENT_KEY).digest("hex")
}

async function sendRequest<T>(endpoint: string, data: Record<string, unknown> = {}): Promise<T> {
  const body = JSON.stringify(data)
  const sign = generateSign(body)

  console.log("[Heleket] Request to:", endpoint)
  console.log("[Heleket] Body:", body)
  console.log("[Heleket] Sign:", sign)

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json;charset=UTF-8",
      "Content-Length": Buffer.byteLength(body).toString(),
      "merchant": MERCHANT_UUID,
      "sign": sign,
    },
    body,
  })

  const responseText = await response.text()
  console.log("[Heleket] Response:", responseText)

  let json: { state?: number; result?: T; message?: string; errors?: unknown }
  try {
    json = JSON.parse(responseText)
  } catch {
    throw new Error(`Invalid JSON response: ${responseText}`)
  }

  if (response.status !== 200 || (json.state !== undefined && json.state !== 0)) {
    throw new Error(json.message || "Heleket API error")
  }

  return json.result as T
}

export interface CreatePaymentParams {
  amount: number
  currency: string
  network?: string
  orderId: string
  callbackUrl: string
  returnUrl: string
  toCurrency?: string
  lifetime?: number
  isPaymentMultiple?: boolean
}

export interface HeleketPaymentResult {
  uuid: string
  order_id: string
  amount: string
  currency: string
  network: string
  address: string
  url: string
  expired_at: number
  status: string
  is_final: boolean
}

export async function createPayment(params: CreatePaymentParams): Promise<HeleketPaymentResult> {
  const data: Record<string, unknown> = {
    amount: params.amount.toFixed(2),
    currency: params.currency,
    order_id: params.orderId,
    url_callback: params.callbackUrl,
    url_return: params.returnUrl,
  }

  if (params.network) {
    data.network = params.network
  }

  if (params.toCurrency) {
    data.to_currency = params.toCurrency
  }

  if (params.lifetime) {
    data.lifetime = params.lifetime.toString()
  }

  if (params.isPaymentMultiple !== undefined) {
    data.is_payment_multiple = params.isPaymentMultiple
  }

  return sendRequest<HeleketPaymentResult>("v1/payment", data)
}

export async function getPaymentInfo(uuid?: string, orderId?: string): Promise<HeleketPaymentResult> {
  const data: Record<string, string> = {}
  if (uuid) data.uuid = uuid
  if (orderId) data.order_id = orderId

  return sendRequest<HeleketPaymentResult>("v1/payment/info", data)
}

export async function getServices(): Promise<unknown> {
  return sendRequest("v1/payment/services", {})
}

export async function getBalance(): Promise<unknown> {
  return sendRequest("v1/balance", {})
}

export interface HeleketWebhookPayload {
  uuid: string
  order_id: string
  amount: string
  currency: string
  network: string
  status: "check" | "paid" | "paid_over" | "wrong_amount" | "fail" | "cancel" | "system_fail" | "refund_process" | "refund_fail" | "refund_paid"
  is_final: boolean
  sign: string
  txid?: string
  payment_amount?: string
  payer_currency?: string
  merchant_amount?: string
  payment_amount_usd?: string
}

export function verifyWebhookSign(payload: HeleketWebhookPayload): boolean {
  const { sign, ...data } = payload
  const body = JSON.stringify(data)
  const calculatedSign = crypto.createHash("md5").update(Buffer.from(body).toString("base64") + PAYMENT_KEY).digest("hex")
  return calculatedSign.toLowerCase() === sign.toLowerCase()
}
