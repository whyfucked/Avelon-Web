import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { 
  createServer, 
  findFreeAllocation, 
  createPterodactylUser,
  findPterodactylUserByEmail 
} from '@/lib/pterodactyl'
import { sendDiscordLog } from '@/lib/discord'
import { adminLogger } from '@/lib/admin-logger'
import { generatePterodactylPassword, encryptPassword, decryptPassword } from '@/lib/pterodactyl-password'

export async function POST(request: NextRequest) {
  try {
    // Проверяем не отключено ли создание серверов
    const serverCreationSetting = await prisma.adminSettings.findUnique({
      where: { key: 'serverCreationDisabled' }
    })
    if (serverCreationSetting?.value === 'true') {
      return NextResponse.json({ 
        error: 'Создание серверов временно отключено. Попробуйте позже.' 
      }, { status: 503 })
    }

    const body = await request.json()
    const { userId, planId, nodeId, eggId, promoCode } = body
    
    const randomNames = ['Phoenix', 'Thunder', 'Shadow', 'Storm', 'Blaze', 'Frost', 'Nova', 'Vortex', 'Titan', 'Spark', 'Echo', 'Pulse', 'Drift', 'Flux', 'Apex']
    const name = body.name?.trim() || `${randomNames[Math.floor(Math.random() * randomNames.length)]}-${Math.random().toString(36).substring(2, 6)}`
    
    console.log('[Create Server] Request body:', { userId, planId, nodeId, name, eggId, promoCode })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Проверка верификации email для пользователей с нестандартными доменами
    if (!user.emailVerified) {
      return NextResponse.json({ 
        error: 'Для создания сервера необходимо подтвердить email. Проверьте почту или обратитесь в поддержку.',
        needsVerification: true
      }, { status: 403 })
    }

    const plan = await prisma.plan.findUnique({ 
      where: { id: planId },
    })
    if (!plan) {
      return NextResponse.json({ error: 'Тариф не найден' }, { status: 404 })
    }

    const effectiveEggId = (eggId as string | undefined) ?? plan.eggId ?? undefined

    if (!effectiveEggId) {
      return NextResponse.json({ error: 'Для тарифа не выбрано ядро' }, { status: 400 })
    }

    const egg = await prisma.pterodactylEgg.findUnique({
      where: { id: effectiveEggId },
    })

    if (!egg || !egg.isActive) {
      return NextResponse.json({ error: 'Выбранное ядро недоступно' }, { status: 400 })
    }

    const node = await prisma.pterodactylNode.findUnique({ where: { id: nodeId } })
    if (!node) {
      return NextResponse.json({ error: 'Локация не найдена' }, { status: 404 })
    }
    
    if (!node.isActive) {
      return NextResponse.json({ error: 'Локация недоступна' }, { status: 400 })
    }

    console.log('[Create Server] Selected node:', {
      id: node.id,
      name: node.name,
      pterodactylId: node.pterodactylId,
      type: node.nodeType,
      isFree: node.isFree,
    })

    // Проверка соответствия типа ноды и категории плана
    if (node.nodeType === 'CODING' && plan.category !== 'CODING') {
      return NextResponse.json({ error: 'На этой локации можно создавать только Coding серверы' }, { status: 400 })
    }
    if (node.nodeType === 'MINECRAFT' && plan.category !== 'MINECRAFT') {
      return NextResponse.json({ error: 'На этой локации можно создавать только Minecraft серверы' }, { status: 400 })
    }

    // Проверка что выбранное ядро разрешено для этого плана
    if (eggId && eggId !== plan.eggId) {
      const allowedEggs = await prisma.planEggOption.findMany({
        where: { planId: plan.id },
        select: { eggId: true }
      })
      const allowedEggIds = [plan.eggId, ...allowedEggs.map(e => e.eggId)].filter(Boolean)
      
      if (!allowedEggIds.includes(eggId)) {
        return NextResponse.json({ error: 'Выбранное ядро недоступно для этого тарифа' }, { status: 400 })
      }
    }

    if (!plan.isFree && node.isFree) {
      return NextResponse.json({ error: 'Вы не можете создать платный тариф на бесплатной локации' }, { status: 400 })
    }
    if (plan.isFree && !node.isFree) {
      return NextResponse.json({ error: 'Бесплатные тарифы можно создавать только на бесплатных локациях' }, { status: 400 })
    }

    if (plan.isFree) {
      const existingFreeServers = await prisma.server.findMany({
        where: {
          userId: user.id,
          plan: { isFree: true },
          status: { not: 'DELETED' },
        },
      })
      if (existingFreeServers.length > 0) {
        return NextResponse.json({ 
          error: 'Вы уже используете бесплатный тариф. Можно иметь только один бесплатный сервер.' 
        }, { status: 400 })
      }
    }

    let discount = 0
    let promoId: string | null = null

    const globalDiscountSetting = await prisma.adminSettings.findUnique({
      where: { key: 'globalDiscount' }
    })
    const globalDiscount = globalDiscountSetting ? parseFloat(globalDiscountSetting.value) : 0

    if (globalDiscount > 0) {
      discount = Math.round((plan.price + node.priceModifier) * (globalDiscount / 100))
    } else if (promoCode) {
      const promo = await prisma.promoCode.findUnique({
        where: { code: promoCode.toUpperCase() },
        include: {
          usages: { where: { userId } },
        },
      })

      if (promo && promo.isActive && promo.type === 'DISCOUNT' && promo.usages.length === 0) {
        if (!promo.expiresAt || new Date(promo.expiresAt) > new Date()) {
          if (!promo.maxUses || promo.usedCount < promo.maxUses) {
            discount = Math.round((plan.price + node.priceModifier) * (promo.value / 100))
            promoId = promo.id
          }
        }
      }
    }

    const totalPrice = Math.max(0, plan.price + node.priceModifier - discount)

    if (user.balance < totalPrice) {
      return NextResponse.json({ 
        error: 'Недостаточно средств на балансе',
        required: totalPrice,
        current: user.balance,
      }, { status: 400 })
    }

    let pterodactylUserId = user.pterodactylId
    let pterodactylPassword = ''
    
    if (!pterodactylUserId) {
      const existingPteroUser = await findPterodactylUserByEmail(user.email)
      
      if (existingPteroUser) {
        pterodactylUserId = existingPteroUser.id
        // Если пользователь уже существует, но у нас нет сохраненного пароля, генерируем новый
        if (!user.pterodactylPassword) {
          pterodactylPassword = generatePterodactylPassword()
          await prisma.user.update({
            where: { id: userId },
            data: { 
              pterodactylId: pterodactylUserId,
              pterodactylPassword: encryptPassword(pterodactylPassword)
            },
          })
        } else {
          pterodactylPassword = decryptPassword(user.pterodactylPassword)
        }
      } else {
        // Создаем нового пользователя с паролем
        pterodactylPassword = generatePterodactylPassword()
        const username = user.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now()
        
        const pteroUser = await createPterodactylUser({
          email: user.email,
          username: username,
          firstName: user.name || 'User',
          lastName: user.id.slice(-4),
          password: pterodactylPassword,
        })
        pterodactylUserId = pteroUser.id
        
        await prisma.user.update({
          where: { id: userId },
          data: { 
            pterodactylId: pterodactylUserId,
            pterodactylPassword: encryptPassword(pterodactylPassword)
          },
        })
      }
    } else {
      // Пользователь уже связан с Pterodactyl, получаем сохраненный пароль
      if (user.pterodactylPassword) {
        pterodactylPassword = decryptPassword(user.pterodactylPassword)
      } else {
        // Если пароль не сохранен, генерируем новый и обновляем в Pterodactyl
        pterodactylPassword = generatePterodactylPassword()
        await prisma.user.update({
          where: { id: userId },
          data: { pterodactylPassword: encryptPassword(pterodactylPassword) },
        })
        
        // Обновляем пароль в Pterodactyl
        const { updatePterodactylUserPassword } = await import('@/lib/pterodactyl')
        await updatePterodactylUserPassword(pterodactylUserId, pterodactylPassword)
      }
    }

    let allocation
    try {
      allocation = await findFreeAllocation(node.pterodactylId)
    } catch (error) {
      console.error('Allocation error:', error)
      
      if (error instanceof Error && error.message === 'Node has no allocations configured') {
        return NextResponse.json({ 
          error: 'Эта локация не настроена для создания серверов. Отсутствуют IP адреса и порты.' 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        error: 'Ошибка при проверке локации' 
      }, { status: 500 })
    }
    
    if (!allocation) {
      return NextResponse.json({ 
        error: 'На этой локации нет свободных слотов для создания сервера.' 
      }, { status: 400 })
    }

    const environment: Record<string, string> = {}
    if (egg.defaultEnv) {
      try {
        Object.assign(environment, JSON.parse(egg.defaultEnv))
      } catch {}
    }
    
    if (plan.category === 'MINECRAFT') {
      environment.SERVER_JARFILE = environment.SERVER_JARFILE || 'server.jar'
      environment.BUILD_NUMBER = environment.BUILD_NUMBER || 'latest'
      
      if (!environment.MINECRAFT_VERSION && !environment.VERSION) {
        environment.MINECRAFT_VERSION = 'latest'
      }
    }
    
    const defaultValues: Record<string, string> = {
      'MINECRAFT_VERSION': 'latest',
      'VERSION': 'latest',
      'SERVER_VERSION': '1.20.1',
      'VANILLA_VERSION': '1.20.1',
      'SERVER_JARFILE': 'server.jar',
      'BUNGEE_VERSION': 'latest',
      'JAVA_VERSION': '17',
      'STARTUP': 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}',
      'STARTUP_CMD': '/start.sh',
      'USER_UPLOAD': '0',
      'AUTO_UPDATE': '0',
      'PY_VERSION': '3.11',
      'PY_FILE': 'main.py',
      'PY_PACKAGES': '',
      'NODE_VERSION': '18',
      'MAIN_FILE': 'index.js',
      'JS_FILE': 'index.js',
      'NODE_ARGS': '',
      'NODE_PACKAGES': '',
      'UNNODE_PACKAGES': '',
      'GIT_ADDRESS': '',
      'GIT_BRANCH': '',
      'REQUIREMENTS_FILE': 'requirements.txt',
    }
    
    for (const [varName, defaultValue] of Object.entries(defaultValues)) {
      if (!environment[varName] || environment[varName] === '') {
        environment[varName] = defaultValue
      }
    }
    
    console.log('[Create Server] Environment variables:', environment)
    
    // Используем стандартную startup команду из egg
    const finalStartupCommand = egg.startup || 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}'
    console.log('[Create Server] Using default startup command:', finalStartupCommand)
    
    console.log('[Create Server] About to create server in Pterodactyl:', {
      name,
      pterodactylUserId,
      eggId: egg.pterodactylId,
      nodeId: node.pterodactylId,
      allocationId: allocation.id,
    })

    let pterodactylServer
    try {
      pterodactylServer = await createServer({
        name,
        userId: pterodactylUserId,
        eggId: egg.pterodactylId,
        nestId: egg.nestId,
        nodeId: node.pterodactylId,
        allocationId: allocation.id,
        ram: plan.ram,
        cpu: plan.cpu,
        disk: plan.disk,
        databases: plan.databases,
        backups: plan.backups,
        allocations: plan.allocations,
        dockerImage: egg.dockerImage || 'ghcr.io/pterodactyl/yolks:java_17',
        startup: finalStartupCommand,
        environment,
      })
      console.log('[Create Server] Pterodactyl server created successfully:', pterodactylServer.id)
    } catch (pteroError) {
      console.error('[Create Server] Pterodactyl error:', pteroError)
      const errorMsg = pteroError instanceof Error ? pteroError.message : String(pteroError)
      
      // Проверяем на ошибку подключения к Wings
      if (errorMsg.toLowerCase().includes('could not establish') || 
          errorMsg.toLowerCase().includes('connection') || 
          errorMsg.toLowerCase().includes('machine running') ||
          errorMsg.toLowerCase().includes('wings') ||
          errorMsg.toLowerCase().includes('daemon')) {
        
        console.error(`[Create Server] Wings daemon issue on node ${node.id} (${node.name})`)
        console.error(`[Create Server] This usually means:`)
        console.error(`  1. Wings is not running on the node`)
        console.error(`  2. Wings cannot connect to Pterodactyl`)
        console.error(`  3. Network/firewall issue between Pterodactyl and Wings`)
        
        return NextResponse.json({ 
          error: 'Локация временно недоступна',
          message: 'Сервер локации не отвечает. Попробуйте выбрать другую локацию.',
          suggestion: 'Ваши средства не были списаны. Попробуйте другую локацию или обратитесь в поддержку.',
          nodeId: node.id,
          nodeName: node.name,
        }, { status: 503 })
      }
      
      // Проверяем на ошибку с allocation
      if (errorMsg.toLowerCase().includes('allocation') || errorMsg.toLowerCase().includes('port')) {
        console.error(`[Create Server] Allocation issue on node ${node.id}`)
        return NextResponse.json({ 
          error: 'Нет свободных портов',
          message: 'На выбранной локации закончились свободные порты.',
          suggestion: 'Попробуйте выбрать другую локацию.',
        }, { status: 400 })
      }
      
      // Проверяем на ошибку с ресурсами
      if (errorMsg.toLowerCase().includes('resource') || errorMsg.toLowerCase().includes('memory') || errorMsg.toLowerCase().includes('disk')) {
        console.error(`[Create Server] Resource issue on node ${node.id}`)
        return NextResponse.json({ 
          error: 'Недостаточно ресурсов',
          message: 'На выбранной локации недостаточно ресурсов для создания сервера.',
          suggestion: 'Попробуйте выбрать другую локацию или тариф.',
        }, { status: 400 })
      }
      
      // Другие ошибки Pterodactyl
      console.error('[Create Server] Pterodactyl API error details:', errorMsg)
      return NextResponse.json({ 
        error: 'Ошибка создания сервера',
        message: 'Не удалось создать сервер в панели управления.',
        suggestion: 'Попробуйте позже или выберите другую локацию. Если проблема повторяется, обратитесь в поддержку.',
        details: errorMsg.substring(0, 200),
      }, { status: 500 })
    }

    const server = await prisma.server.create({
      data: {
        name,
        userId,
        planId,
        nodeId,
        eggId: egg.id,
        pterodactylId: pterodactylServer.id,
        pterodactylUuid: pterodactylServer.uuid,
        pterodactylIdentifier: pterodactylServer.identifier,
        status: 'INSTALLING',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paidAmount: totalPrice, // Сохраняем фактически оплаченную сумму
      },
    })

    await prisma.user.update({
      where: { id: userId },
      data: { balance: { decrement: totalPrice } },
    })

    await prisma.transaction.create({
      data: {
        userId,
        type: 'PAYMENT',
        amount: -totalPrice,
        description: discount > 0 
          ? `Сервер "${name}" - ${plan.name} (скидка ${discount} ₽)`
          : `Сервер "${name}" - ${plan.name}`,
        serverId: server.id,
      },
    })

    if (promoId) {
      await prisma.promoUsage.create({
        data: { promoId, userId },
      })
      await prisma.promoCode.update({
        where: { id: promoId },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Отправляем лог в Discord
    await sendDiscordLog({
      type: 'SERVER_CREATE',
      userId,
      userEmail: user.email,
      amount: totalPrice,
      serverName: name,
      planName: plan.name,
      description: discount > 0 ? `Скидка: ${discount} ₽` : undefined,
    })

    // Логирование для админки
    await adminLogger.serverCreate(userId, server.id, name, plan.name)

    return NextResponse.json({ 
      success: true, 
      server: {
        id: server.id,
        name: server.name,
        identifier: pterodactylServer.identifier,
        status: server.status,
      },
      pterodactyl: {
        password: pterodactylPassword,
        panelUrl: process.env.NEXT_PUBLIC_PTERODACTYL_URL || 'https://control.yourdomain.ru',
        username: user.email
      }
    })
  } catch (error) {
    console.error('Create server error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error details:', errorMessage)
    return NextResponse.json({ 
      error: 'Ошибка при создании сервера',
      details: errorMessage,
    }, { status: 500 })
  }
}
