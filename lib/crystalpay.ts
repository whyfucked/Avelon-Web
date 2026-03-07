import crypto from "crypto"

const AUTH_LOGIN = process.env.CRYSTALPAY_LOGIN!
const AUTH_SECRET = process.env.CRYSTALPAY_SECRET!
const SALT = process.env.CRYSTALPAY_SALT!
const API_URL = "https://api.crystalpay.io/v2"

export interface CreateInvoiceParams {
  amount: number
  amountCurrency: string
  orderId: string
  description: string
  callbackUrl: string
  redirectUrl: string
  payerDetails?: string
  lifetime?: number
}

export interface CrystalPayInvoiceResult {
  id: string
  url: string
  type: string
  amount: string
  amount_currency: string
  state: string
}

export interface CrystalPayResponse<T> {
  error: boolean
  errors?: string[]
  auth?: boolean
  data?: T
  id?: string
  url?: string
  type?: string
  amount?: string
  amount_currency?: string
  state?: string
}

export async function createInvoice(params: CreateInvoiceParams): Promise<CrystalPayInvoiceResult> {
  const requestData = {
    auth_login: AUTH_LOGIN,
    auth_secret: AUTH_SECRET,
    amount: params.amount,
    amount_currency: params.amountCurrency,
    type: "purchase",
    description: params.description,
    redirect_url: params.redirectUrl,
    callback_url: params.callbackUrl,
    extra: params.orderId,
    payer_details: params.payerDetails,
    lifetime: params.lifetime || 4320, // 3 дня по умолчанию
  }

  console.log("[CrystalPay] Creating invoice:", { ...requestData, auth_secret: "***" })

  const response = await fetch(`${API_URL}/invoice/create/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  })

  const result = await response.json() as CrystalPayResponse<CrystalPayInvoiceResult>

  console.log("[CrystalPay] Response:", result)

  if (result.error || !result.id || !result.url) {
    const errorMsg = result.errors?.join(", ") || "Unknown error"
    throw new Error(`CrystalPay API error: ${errorMsg}`)
  }

  return {
    id: result.id,
    url: result.url,
    type: result.type || "purchase",
    amount: result.amount || params.amount.toString(),
    amount_currency: result.amount_currency || params.amountCurrency,
    state: result.state || "notpayed",
  }
}

export interface CrystalPayWebhookPayload {
  id: string
  order_id: string
  amount: string
  amount_currency: string
  type: string
  state: "notpayed" | "processing" | "payed" | "canceled"
  extra?: string
  signature: string
}

export function verifyWebhookSignature(payload: CrystalPayWebhookPayload): boolean {
  const { signature, ...data } = payload
  
  const signString = `${data.id}:${data.amount}:${SALT}`
  const calculatedSignature = crypto
    .createHash("sha1")
    .update(signString)
    .digest("hex")

  console.log("[CrystalPay] Signature verification:", {
    received: signature,
    calculated: calculatedSignature,
    match: calculatedSignature === signature,
  })

  return calculatedSignature === signature
}
