/**
 * VMManager6 Rentals Management
 * Управление арендами VDS серверов через локальную JSON базу данных
 */

import { readDatabase, writeDatabase } from '../lib/local-db'

export interface VMManager6Rental {
  id: string
  user_id: string
  server_id: string // формат: vmmanager6_{hostId}
  vmmanager6_host_id: number
  vmmanager6_account_id?: number
  plan_name: string
  rental_price: number
  rental_days: number
  status: 'active' | 'suspended' | 'banned' | 'deleted'
  auto_renew: boolean
  created_at: string
  expires_at: string
  updated_at: string
}

export interface CreateVMManager6RentalData {
  user_id: string
  vmmanager6_host_id: number
  vmmanager6_account_id?: number
  plan_name: string
  rental_price: number
  rental_days: number
  auto_renew?: boolean
}

export interface UpdateVMManager6RentalData {
  plan_name?: string
  rental_price?: number
  rental_days?: number
  status?: 'active' | 'suspended' | 'banned' | 'deleted'
  auto_renew?: boolean
  vmmanager6_account_id?: number
  expires_at?: string
}

/**
 * Генерация уникального ID для аренды
 */
function generateRentalId(): string {
  return `vmr6_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Получить все аренды пользователя
 */
export function getVMManager6Rentals(userId: string): VMManager6Rental[] {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  return rentals.filter((rental: VMManager6Rental) => rental.user_id === userId)
}

/**
 * Получить аренду по ID
 */
export function getVMManager6RentalById(rentalId: string): VMManager6Rental | null {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  return rentals.find((rental: VMManager6Rental) => rental.id === rentalId) || null
}

/**
 * Получить аренду по server_id для конкретного пользователя
 */
export function getVMManager6RentalByServerId(userId: string, serverId: string): VMManager6Rental | null {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  return rentals.find(
    (rental: VMManager6Rental) => rental.user_id === userId && rental.server_id === serverId
  ) || null
}

/**
 * Получить аренду по hostId (без привязки к пользователю)
 */
export function getVMManager6RentalByHostId(hostId: number): VMManager6Rental | null {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  return rentals.find(
    (rental: VMManager6Rental) => rental.vmmanager6_host_id === hostId
  ) || null
}

/**
 * Создать новую аренду
 */
export function createVMManager6Rental(data: CreateVMManager6RentalData): VMManager6Rental {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []

  const now = new Date()
  const expiresAt = new Date(now.getTime() + data.rental_days * 24 * 60 * 60 * 1000)

  const newRental: VMManager6Rental = {
    id: generateRentalId(),
    user_id: data.user_id,
    server_id: `vmmanager6_${data.vmmanager6_host_id}`,
    vmmanager6_host_id: data.vmmanager6_host_id,
    vmmanager6_account_id: data.vmmanager6_account_id,
    plan_name: data.plan_name,
    rental_price: data.rental_price,
    rental_days: data.rental_days,
    status: 'active',
    auto_renew: data.auto_renew ?? false,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    updated_at: now.toISOString()
  }

  rentals.push(newRental)
  db.vmmanager6_rentals = rentals
  writeDatabase(db)

  return newRental
}

/**
 * Обновить аренду
 */
export function updateVMManager6Rental(
  rentalId: string,
  updates: UpdateVMManager6RentalData
): VMManager6Rental | null {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  const index = rentals.findIndex((rental: VMManager6Rental) => rental.id === rentalId)

  if (index === -1) {
    return null
  }

  const updatedRental: VMManager6Rental = {
    ...rentals[index],
    ...updates,
    updated_at: new Date().toISOString()
  }

  rentals[index] = updatedRental
  db.vmmanager6_rentals = rentals
  writeDatabase(db)

  return updatedRental
}

/**
 * Продлить аренду на N дней
 */
export function renewVMManager6Rental(rentalId: string, days: number): VMManager6Rental | null {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  const index = rentals.findIndex((rental: VMManager6Rental) => rental.id === rentalId)

  if (index === -1) {
    return null
  }

  const rental = rentals[index]
  const currentExpires = new Date(rental.expires_at)
  const now = new Date()

  const baseDate = currentExpires > now ? currentExpires : now
  const newExpiresAt = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

  const updatedRental: VMManager6Rental = {
    ...rental,
    expires_at: newExpiresAt.toISOString(),
    rental_days: rental.rental_days + days,
    status: 'active', // При продлении восстанавливаем активный статус
    updated_at: now.toISOString()
  }

  rentals[index] = updatedRental
  db.vmmanager6_rentals = rentals
  writeDatabase(db)

  return updatedRental
}

/**
 * Получить все истёкшие аренды
 */
export function getExpiredVMManager6Rentals(): VMManager6Rental[] {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  const now = new Date()

  return rentals.filter((rental: VMManager6Rental) => {
    const expiresAt = new Date(rental.expires_at)
    return expiresAt < now && rental.status === 'active'
  })
}

/**
 * Пометить сервер как suspended по hostId
 */
export function suspendVMManager6ServerInDatabase(hostId: number): VMManager6Rental | null {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  const index = rentals.findIndex(
    (rental: VMManager6Rental) => rental.vmmanager6_host_id === hostId
  )

  if (index === -1) {
    return null
  }

  const updatedRental: VMManager6Rental = {
    ...rentals[index],
    status: 'suspended',
    updated_at: new Date().toISOString()
  }

  rentals[index] = updatedRental
  db.vmmanager6_rentals = rentals
  writeDatabase(db)

  return updatedRental
}

/**
 * Пометить сервер как deleted по hostId
 */
export function deleteVMManager6ServerFromDatabase(hostId: number): VMManager6Rental | null {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  const index = rentals.findIndex(
    (rental: VMManager6Rental) => rental.vmmanager6_host_id === hostId
  )

  if (index === -1) {
    return null
  }

  const updatedRental: VMManager6Rental = {
    ...rentals[index],
    status: 'deleted',
    updated_at: new Date().toISOString()
  }

  rentals[index] = updatedRental
  db.vmmanager6_rentals = rentals
  writeDatabase(db)

  return updatedRental
}

/**
 * Пометить сервер как banned по hostId
 */
export function banVMManager6ServerInDatabase(hostId: number): VMManager6Rental | null {
  const db = readDatabase()
  const rentals = db.vmmanager6_rentals || []
  const index = rentals.findIndex(
    (rental: VMManager6Rental) => rental.vmmanager6_host_id === hostId
  )

  if (index === -1) {
    return null
  }

  const updatedRental: VMManager6Rental = {
    ...rentals[index],
    status: 'banned',
    updated_at: new Date().toISOString()
  }

  rentals[index] = updatedRental
  db.vmmanager6_rentals = rentals
  writeDatabase(db)

  return updatedRental
}
