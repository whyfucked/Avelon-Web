import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generatePterodactylPassword, encryptPassword } from "@/lib/pterodactyl-password"

const PTERODACTYL_URL = process.env.PTERODACTYL_URL || "https://control.yourdomain.ru"
const PTERODACTYL_API_KEY = process.env.PTERODACTYL_API_KEY

export async function POST() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { pterodactylId: true, email: true }
    })

    if (!dbUser?.pterodactylId) {
      return NextResponse.json({ error: "Аккаунт Pterodactyl не найден" }, { status: 404 })
    }

    const newPassword = generatePterodactylPassword()

    // Update password in Pterodactyl
    const res = await fetch(`${PTERODACTYL_URL}/api/application/users/${dbUser.pterodactylId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${PTERODACTYL_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        email: dbUser.email,
        username: dbUser.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 20) || 'user',
        first_name: user.name || dbUser.email.split('@')[0],
        last_name: "User",
        password: newPassword
      })
    })

    if (!res.ok) {
      const error = await res.text()
      console.error("[Pterodactyl Reset Password] Error:", error)
      return NextResponse.json({ error: "Ошибка сброса пароля" }, { status: 500 })
    }

    // Сохраняем новый пароль в базе данных
    await prisma.user.update({
      where: { id: user.id },
      data: { pterodactylPassword: encryptPassword(newPassword) }
    })

    // Send email with new password
    try {
      const { sendEmail } = await import("@/lib/email")
      await sendEmail({
        to: dbUser.email,
        subject: "Новый пароль от панели управления",
        html: `
          <h2>Сброс пароля</h2>
          <p>Ваш новый пароль от панели управления серверами:</p>
          <p style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 10px; border-radius: 5px;">${newPassword}</p>
          <p>Панель: <a href="${PTERODACTYL_URL}">${PTERODACTYL_URL}</a></p>
          <p>Логин: ${dbUser.email}</p>
        `
      })
    } catch (emailError) {
      console.error("[Email] Error sending password:", emailError)
    }

    return NextResponse.json({ success: true, message: "Новый пароль отправлен на почту" })
  } catch (error) {
    console.error("[Pterodactyl Reset Password] Error:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}
