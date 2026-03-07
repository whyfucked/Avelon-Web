import { prisma } from '@/lib/db'
import { headers } from 'next/headers'

export type AdminLogAction = 
  | 'USER_LOGIN'
  | 'USER_LOGOUT' 
  | 'USER_REGISTER'
  | 'BALANCE_ADD'
  | 'BALANCE_SUBTRACT'
  | 'SERVER_CREATE'
  | 'SERVER_DELETE'
  | 'SERVER_SUSPEND'
  | 'SERVER_UNSUSPEND'
  | 'VDS_CREATE'
  | 'VDS_DELETE'
  | 'VDS_SUSPEND'
  | 'VDS_UNSUSPEND'
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'SETTINGS_UPDATE'
  | 'PLAN_CREATE'
  | 'PLAN_UPDATE'
  | 'PLAN_DELETE'
  | 'USER_UPDATE'
  | 'USER_DELETE'

interface LogParams {
  action: AdminLogAction
  description: string
  userId?: string
  adminId?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

export async function logAdminAction({
  action,
  description,
  userId,
  adminId,
  metadata,
  ipAddress,
  userAgent
}: LogParams) {
  try {
    if (!ipAddress || !userAgent) {
      try {
        const headersList = await headers()
        
        if (!ipAddress) {
          const bunnyIp = headersList.get('cdn-real-ip') || 
                         headersList.get('x-pullzone-ip') ||
                         headersList.get('x-bunny-ip')
          
          if (bunnyIp) {
            ipAddress = bunnyIp
          } else {
            const forwardedFor = headersList.get('x-forwarded-for')
            if (forwardedFor) {
              ipAddress = forwardedFor.split(',')[0].trim()
            } else {
              ipAddress = headersList.get('x-real-ip') || 
                         headersList.get('cf-connecting-ip') || 
                         headersList.get('true-client-ip') ||
                         headersList.get('x-client-ip') ||
                         'unknown'
            }
          }
        }
        
        userAgent = userAgent || headersList.get('user-agent') || 'unknown'
      } catch {
        // Если headers недоступны (например, в server action), используем переданные значения или unknown
        ipAddress = ipAddress || 'unknown'
        userAgent = userAgent || 'unknown'
      }
    }

    await prisma.adminLog.create({
      data: {
        action,
        description,
        userId,
        adminId,
        ipAddress,
        userAgent,
        metadata: metadata ? JSON.stringify(metadata) : null,
      }
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
    // Не бросаем ошибку, чтобы не нарушить основной процесс
  }
}

// Вспомогательные функции для часто используемых логов
export const adminLogger = {
  userLogin: (userId: string, ipAddress?: string, userAgent?: string) =>
    logAdminAction({
      action: 'USER_LOGIN',
      description: 'Пользователь вошел в систему',
      userId,
      ipAddress,
      userAgent
    }),

  userLogout: (userId: string, ipAddress?: string, userAgent?: string) =>
    logAdminAction({
      action: 'USER_LOGOUT', 
      description: 'Пользователь вышел из системы',
      userId,
      ipAddress,
      userAgent
    }),

  userRegister: (userId: string, email: string, ipAddress?: string, userAgent?: string) =>
    logAdminAction({
      action: 'USER_REGISTER',
      description: `Регистрация нового пользователя: ${email}`,
      userId,
      metadata: { email },
      ipAddress,
      userAgent
    }),

  balanceAdd: (userId: string, adminId: string, amount: number, reason?: string) =>
    logAdminAction({
      action: 'BALANCE_ADD',
      description: `Пополнение баланса на ${amount}₽${reason ? ` (${reason})` : ''}`,
      userId,
      adminId,
      metadata: { amount, reason }
    }),

  balanceSubtract: (userId: string, adminId: string, amount: number, reason?: string) =>
    logAdminAction({
      action: 'BALANCE_SUBTRACT',
      description: `Списание с баланса ${amount}₽${reason ? ` (${reason})` : ''}`,
      userId,
      adminId,
      metadata: { amount, reason }
    }),

  serverCreate: (userId: string, serverId: string, serverName: string, planName: string) =>
    logAdminAction({
      action: 'SERVER_CREATE',
      description: `Создан сервер "${serverName}" (план: ${planName})`,
      userId,
      metadata: { serverId, serverName, planName }
    }),

  serverDelete: (userId: string, adminId: string, serverId: string, serverName: string) =>
    logAdminAction({
      action: 'SERVER_DELETE',
      description: `Удален сервер "${serverName}"`,
      userId,
      adminId,
      metadata: { serverId, serverName }
    }),

  vdsCreate: (userId: string, vdsId: string, vdsName: string, planName: string) =>
    logAdminAction({
      action: 'VDS_CREATE',
      description: `Создан VDS "${vdsName}" (план: ${planName})`,
      userId,
      metadata: { vdsId, vdsName, planName }
    }),

  adminLogin: (adminId: string, ipAddress?: string, userAgent?: string) =>
    logAdminAction({
      action: 'ADMIN_LOGIN',
      description: 'Администратор вошел в систему',
      adminId,
      ipAddress,
      userAgent
    }),

  settingsUpdate: (adminId: string, setting: string, oldValue: any, newValue: any) =>
    logAdminAction({
      action: 'SETTINGS_UPDATE',
      description: `Изменена настройка "${setting}"`,
      adminId,
      metadata: { setting, oldValue, newValue }
    })
}