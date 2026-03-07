import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

const PTERODACTYL_URL = process.env.PTERODACTYL_URL
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY

// Запрещенные флаги для безопасности
const FORBIDDEN_FLAGS = [
  '-cp', '--class-path', '--classpath',
  '-javaagent',
  'Runtime.getRuntime',
  'ProcessBuilder',
  'exec(',
  'system(',
  '&&', '||', ';', '|', '>', '<', '`', '$(',
]

function validateStartupCommand(command: string): { valid: boolean; error?: string } {
  // Проверка на запрещенные флаги
  const lowerCommand = command.toLowerCase()
  for (const flag of FORBIDDEN_FLAGS) {
    if (lowerCommand.includes(flag.toLowerCase())) {
      return { valid: false, error: `Запрещенный флаг или команда: ${flag}` }
    }
  }

  // Проверка что команда начинается с java
  if (!command.trim().startsWith('java ')) {
    return { valid: false, error: 'Команда должна начинаться с "java "' }
  }

  // Проверка что есть -jar {{SERVER_JARFILE}}
  if (!command.includes('-jar {{SERVER_JARFILE}}')) {
    return { valid: false, error: 'Команда должна содержать "-jar {{SERVER_JARFILE}}"' }
  }

  return { valid: true }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизованы' }, { status: 401 })
    }

    const { preset, customCommand } = await request.json()

    // Проверяем что сервер принадлежит пользователю
    const server = await prisma.server.findFirst({
      where: {
        id: id,
        userId: user.id,
      },
      include: {
        plan: true,
        egg: true,
      },
    })

    if (!server) {
      return NextResponse.json({ error: 'Сервер не найден' }, { status: 404 })
    }

    // Проверяем что это Minecraft сервер
    if (server.plan.category !== 'MINECRAFT') {
      return NextResponse.json({ 
        error: 'Кастомные команды доступны только для Minecraft серверов' 
      }, { status: 400 })
    }

    if (!server.pterodactylId) {
      return NextResponse.json({ 
        error: 'Сервер еще не создан в панели' 
      }, { status: 400 })
    }

    let startupCommand = ''
    let startupPreset = preset

    // Формируем команду в зависимости от пресета
    switch (preset) {
      case 'default':
        startupCommand = `java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}`
        break
      
      case 'akira':
        startupCommand = `java -Xms128M -Xmx{{SERVER_MEMORY}}M --add-modules=jdk.incubator.vector -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -jar {{SERVER_JARFILE}}`
        break
      
      case 'velocity':
        startupCommand = `java -Xms128M -Xmx{{SERVER_MEMORY}}M -XX:+UseG1GC -XX:G1HeapRegionSize=4M -XX:+UnlockExperimentalVMOptions -XX:+ParallelRefProcEnabled -XX:+AlwaysPreTouch -XX:MaxInlineLevel=15 -jar {{SERVER_JARFILE}}`
        break
      
      case 'custom':
        if (!customCommand) {
          return NextResponse.json({ 
            error: 'Не указана кастомная команда' 
          }, { status: 400 })
        }
        
        // Валидация кастомной команды
        const validation = validateStartupCommand(customCommand)
        if (!validation.valid) {
          return NextResponse.json({ 
            error: validation.error 
          }, { status: 400 })
        }
        
        startupCommand = customCommand
        break
      
      default:
        return NextResponse.json({ 
          error: 'Неизвестный пресет' 
        }, { status: 400 })
    }

    // Обновляем команду в Pterodactyl
    if (!PTERODACTYL_URL || !PTERODACTYL_API_KEY) {
      return NextResponse.json({ 
        error: 'Pterodactyl не настроен' 
      }, { status: 500 })
    }

    // Получаем текущие environment переменные
    let environment: Record<string, string> = {}
    if (server.egg?.defaultEnv) {
      try {
        environment = JSON.parse(server.egg.defaultEnv)
      } catch (e) {
        console.error('[Startup Update] Failed to parse defaultEnv:', e)
      }
    }

    const pteroResponse = await fetch(
      `${PTERODACTYL_URL}/api/application/servers/${server.pterodactylId}/startup`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          startup: startupCommand,
          environment: environment,
          egg: server.egg?.pterodactylId || 1,
          image: server.egg?.dockerImage || 'ghcr.io/pterodactyl/yolks:java_17',
          skip_scripts: false,
        }),
      }
    )

    if (!pteroResponse.ok) {
      const errorText = await pteroResponse.text()
      console.error('[Startup Update] Pterodactyl error:', errorText)
      return NextResponse.json({ 
        error: 'Не удалось обновить команду в панели' 
      }, { status: 500 })
    }

    // Сохраняем в базу данных
    await prisma.server.update({
      where: { id: id },
      data: {
        startupCommand,
        startupPreset,
      },
    })

    return NextResponse.json({ 
      success: true,
      startupCommand,
      startupPreset,
    })
  } catch (error) {
    console.error('[Startup Update] Error:', error)
    return NextResponse.json({ 
      error: 'Ошибка при обновлении команды запуска' 
    }, { status: 500 })
  }
}
