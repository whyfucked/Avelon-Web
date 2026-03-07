"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Server, Globe, HardDrive, RefreshCw, RotateCw } from "lucide-react"
import { notify } from "@/lib/notify"

interface User {
  id: string
  email: string
  name: string | null
}

interface Service {
  id: string
  name: string
  status: string
  expiresAt: string | null
  gracePeriodEnd: string | null
  createdAt: string
  paidAmount: number | null
  specs?: string | null
  user: { id: string; email: string; name: string | null }
  ipAddress?: string
  ftpHost?: string
}

interface ServiceManagerProps {
  serviceType: "dedicated" | "domain" | "storagebox"
  users: User[]
}

const osOptions = [
  "Ubuntu 22.04",
  "Ubuntu 20.04",
  "Debian 12",
  "Debian 11",
  "CentOS 9",
  "AlmaLinux 9",
  "Rocky Linux 9",
]

const statusColors: Record<string, string> = {
  UNPAID: "bg-red-500/20 text-red-500",
  PENDING: "bg-amber-500/20 text-amber-500",
  INSTALLING: "bg-blue-500/20 text-blue-500",
  READY: "bg-cyan-500/20 text-cyan-500",
  ACTIVE: "bg-emerald-500/20 text-emerald-500",
  SUSPENDED: "bg-red-500/20 text-red-500",
  GRACE_PERIOD: "bg-orange-500/20 text-orange-500",
}

const statusLabels: Record<string, string> = {
  UNPAID: "Не оплачен",
  PENDING: "Ожидание",
  INSTALLING: "Установка",
  READY: "Готов",
  ACTIVE: "Активен",
  SUSPENDED: "Приостановлен",
  GRACE_PERIOD: "Grace Period",
}

export function ServiceManager({ serviceType, users }: ServiceManagerProps) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    userId: "",
    name: "",
    months: 1,
    price: 0,
    // Dedicated
    ipAddress: "",
    rootPassword: "",
    cpu: "",
    ram: 0,
    disk: 0,
    network: 0,
    // StorageBox
    ftpHost: "",
    ftpUser: "",
    ftpPassword: "",
    sizeGB: 100,
    // Domain
    registrar: "",
    // Common
    status: "UNPAID",
    expiresAt: "",
  })

  // Reinstall modal
  const [reinstallModal, setReinstallModal] = useState<Service | null>(null)
  const [reinstallOs, setReinstallOs] = useState("Ubuntu 22.04")
  const [reinstallPassword, setReinstallPassword] = useState("")
  const [reinstalling, setReinstalling] = useState(false)

  const serviceConfig = useMemo(
    () => ({
      dedicated: {
        title: "Дедики",
        icon: Server,
        apiPath: "/api/admin/dedicated",
        nameLabel: "Имя сервера",
        namePlaceholder: "dedicated-1",
      },
      domain: {
        title: "Домены",
        icon: Globe,
        apiPath: "/api/admin/domains",
        nameLabel: "Доменное имя",
        namePlaceholder: "example.com",
      },
      storagebox: {
        title: "StorageBox",
        icon: HardDrive,
        apiPath: "/api/admin/storagebox",
        nameLabel: "Имя хранилища",
        namePlaceholder: "storage-1",
      },
    }),
    []
  )

  const config = serviceConfig[serviceType]
  const Icon = config.icon

  useEffect(() => {
    loadServices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType])

  const loadServices = async () => {
    setLoading(true)
    try {
      const r = await fetch(config.apiPath)
      if (r.ok) {
        const data = await r.json()
        setServices(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error(`[${serviceType}] Load error:`, error)
      notify.error("Ошибка загрузки")
    } finally {
      setLoading(false)
    }
  }

  const createService = async () => {
    if (!formData.userId || !formData.name) {
      notify.error("Заполните обязательные поля")
      return
    }

    try {
      const payload: any = {
        userId: formData.userId,
        name: formData.name,
        months: formData.months,
        price: formData.price,
        status: formData.status,
        expiresAt: formData.expiresAt || undefined,
      }

      if (serviceType === "dedicated") {
        payload.ipAddress = formData.ipAddress
        payload.rootPassword = formData.rootPassword
        payload.cpu = formData.cpu
        payload.ram = formData.ram
        payload.disk = formData.disk
        payload.network = formData.network
      } else if (serviceType === "domain") {
        payload.registrar = formData.registrar
      } else if (serviceType === "storagebox") {
        payload.ftpHost = formData.ftpHost
        payload.ftpUser = formData.ftpUser
        payload.ftpPassword = formData.ftpPassword
        payload.sizeGB = formData.sizeGB
      }

      const r = await fetch(config.apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (r.ok) {
        notify.success(`${config.title} создан и данные отправлены на email`)
        setShowCreateForm(false)
        setFormData({
          userId: "",
          name: "",
          months: 1,
          price: 0,
          ipAddress: "",
          rootPassword: "",
          cpu: "",
          ram: 0,
          disk: 0,
          network: 0,
          ftpHost: "",
          ftpUser: "",
          ftpPassword: "",
          sizeGB: 100,
          registrar: "",
          status: "UNPAID",
          expiresAt: "",
        })
        loadServices()
      } else {
        const data = await r.json().catch(() => ({}))
        notify.error(data?.error || "Ошибка создания")
      }
    } catch {
      notify.error("Ошибка создания")
    }
  }

  const deleteService = async (id: string) => {
    if (!confirm(`Удалить ${config.title.toLowerCase()}?`)) return

    try {
      const r = await fetch(`${config.apiPath}?id=${id}`, { method: "DELETE" })
      if (r.ok) {
        notify.success("Удалено")
        loadServices()
      } else {
        const data = await r.json().catch(() => ({}))
        notify.error(data?.error || "Ошибка удаления")
      }
    } catch {
      notify.error("Ошибка удаления")
    }
  }

  const suspendService = async (id: string, action: "suspend" | "unsuspend") => {
    try {
      const idKey =
        serviceType === "domain" ? "domainId" : serviceType === "storagebox" ? "boxId" : "serverId"

      const r = await fetch(config.apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [idKey]: id, action }),
      })

      if (r.ok) {
        notify.success(action === "suspend" ? "Приостановлено" : "Возобновлено")
        loadServices()
      } else {
        const data = await r.json().catch(() => ({}))
        notify.error(data?.error || "Ошибка")
      }
    } catch {
      notify.error("Ошибка")
    }
  }

  const changeStatus = async (id: string, newStatus: string) => {
    try {
      const idKey =
        serviceType === "domain" ? "domainId" : serviceType === "storagebox" ? "boxId" : "serverId"

      const r = await fetch(config.apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [idKey]: id, status: newStatus }),
      })

      if (r.ok) {
        notify.success(`Статус изменён на "${statusLabels[newStatus] || newStatus}"`)
        loadServices()
      } else {
        const data = await r.json().catch(() => ({}))
        notify.error(data?.error || "Ошибка")
      }
    } catch {
      notify.error("Ошибка")
    }
  }

  const handleReinstall = async () => {
    if (!reinstallModal || !reinstallOs || !reinstallPassword) {
      notify.error("Заполните все поля")
      return
    }

    setReinstalling(true)
    try {
      const r = await fetch("/api/admin/dedicated/reinstall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId: reinstallModal.id,
          osName: reinstallOs,
          password: reinstallPassword,
        }),
      })

      const data = await r.json().catch(() => ({}))
      if (r.ok) {
        notify.success("Запрос на переустановку отправлен в Discord")
        setReinstallModal(null)
        setReinstallOs("Ubuntu 22.04")
        setReinstallPassword("")
        loadServices()
      } else {
        notify.error(data?.error || "Ошибка")
      }
    } catch {
      notify.error("Ошибка отправки запроса")
    } finally {
      setReinstalling(false)
    }
  }

  const titleCount = services.length

  return (
    <div className="space-y-4">
      {/* Header (как в AdminServersTable) */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">
          {titleCount} {config.title.toLowerCase()}
        </h1>

        <div className="flex gap-2">
          <button
            onClick={loadServices}
            disabled={loading}
            className="size-9 rounded-xl bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            title="Обновить"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
          >
            <Plus className="size-4" />
            Создать
          </button>
        </div>
      </div>

      {/* Create Form (в том же стиле) */}
      {showCreateForm && (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-medium text-foreground">Создать {config.title}</h3>
              <p className="text-sm text-muted-foreground">Заполните параметры и отправьте пользователю</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Пользователь</label>
              <select
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Выберите пользователя</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} {u.name ? `(${u.name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Цена (₽)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{config.nameLabel}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={config.namePlaceholder}
                className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Период (месяцев)</label>
              <input
                type="number"
                value={formData.months}
                onChange={(e) => setFormData({ ...formData, months: parseInt(e.target.value) || 1 })}
                min="1"
                className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="UNPAID">Не оплачен</option>
                <option value="INSTALLING">Установка</option>
                <option value="READY">Готов</option>
                <option value="ACTIVE">Активен</option>
                <option value="SUSPENDED">Приостановлен</option>
                <option value="GRACE_PERIOD">Grace Period</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Дата истечения (опционально)</label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground mt-1">Если не указано, будет вычислено автоматически</p>
            </div>

            {serviceType === "dedicated" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">IP адрес</label>
                  <input
                    type="text"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    placeholder="192.168.1.1"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Root пароль</label>
                  <input
                    type="text"
                    value={formData.rootPassword}
                    onChange={(e) => setFormData({ ...formData, rootPassword: e.target.value })}
                    placeholder="Пароль"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">CPU (процессор)</label>
                  <input
                    type="text"
                    value={formData.cpu}
                    onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
                    placeholder="Intel Xeon E5-2680 v4"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">RAM (GB)</label>
                  <input
                    type="number"
                    value={formData.ram}
                    onChange={(e) => setFormData({ ...formData, ram: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="16"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Disk (GB)</label>
                  <input
                    type="number"
                    value={formData.disk}
                    onChange={(e) => setFormData({ ...formData, disk: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="500"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Network (Mbit/s)</label>
                  <input
                    type="number"
                    value={formData.network}
                    onChange={(e) => setFormData({ ...formData, network: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="1000"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </>
            )}

            {serviceType === "domain" && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Регистратор</label>
                <input
                  type="text"
                  value={formData.registrar}
                  onChange={(e) => setFormData({ ...formData, registrar: e.target.value })}
                  placeholder="Namecheap, GoDaddy..."
                  className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {serviceType === "storagebox" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">FTP Host</label>
                  <input
                    type="text"
                    value={formData.ftpHost}
                    onChange={(e) => setFormData({ ...formData, ftpHost: e.target.value })}
                    placeholder="ftp.example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">FTP User</label>
                  <input
                    type="text"
                    value={formData.ftpUser}
                    onChange={(e) => setFormData({ ...formData, ftpUser: e.target.value })}
                    placeholder="username"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">FTP Password</label>
                  <input
                    type="text"
                    value={formData.ftpPassword}
                    onChange={(e) => setFormData({ ...formData, ftpPassword: e.target.value })}
                    placeholder="password"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Размер (GB)</label>
                  <input
                    type="number"
                    value={formData.sizeGB}
                    onChange={(e) => setFormData({ ...formData, sizeGB: parseInt(e.target.value) || 100 })}
                    min="1"
                    className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 rounded-xl bg-accent text-foreground text-sm hover:bg-accent/80 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={createService}
              className="px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              Создать и отправить на email
            </button>
          </div>
        </div>
      )}

      {/* Reinstall Modal (оставил в том же визуальном стиле) */}
      {reinstallModal && serviceType === "dedicated" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="font-medium text-foreground">Переустановка ОС</h3>
              <p className="text-sm text-muted-foreground">Сервер: {reinstallModal.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Выберите ОС</label>
              <select
                value={reinstallOs}
                onChange={(e) => setReinstallOs(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {osOptions.map((os) => (
                  <option key={os} value={os}>
                    {os}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Новый пароль</label>
              <input
                type="text"
                value={reinstallPassword}
                onChange={(e) => setReinstallPassword(e.target.value)}
                placeholder="Введите новый пароль"
                className="w-full px-4 py-2.5 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setReinstallModal(null)
                  setReinstallOs("Ubuntu 22.04")
                  setReinstallPassword("")
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-accent text-foreground text-sm hover:bg-accent/80 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleReinstall}
                disabled={reinstalling || !reinstallPassword}
                className="flex-1 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {reinstalling ? "Отправка..." : "Отправить запрос"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table (как в AdminServersTable) */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-accent/30">
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                {serviceType === "domain" ? "Домен" : serviceType === "storagebox" ? "Хранилище" : "Сервис"}
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Пользователь</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Цена</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Статус</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Истекает</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {services.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                  <Icon className="size-12 mx-auto mb-3 opacity-50" />
                  <p>Нет {config.title.toLowerCase()}</p>
                </td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-accent flex items-center justify-center">
                        <Icon className="size-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{service.name}</p>

                        {service.ipAddress && <p className="text-xs text-muted-foreground">{service.ipAddress}</p>}
                        {service.ftpHost && <p className="text-xs text-muted-foreground">{service.ftpHost}</p>}

                        {serviceType === "dedicated" && service.specs && (() => {
                          try {
                            const specs = JSON.parse(service.specs as string)
                            return (
                              <p className="text-xs text-muted-foreground">
                                {specs.cpu} / {specs.ram}GB / {specs.disk}GB
                              </p>
                            )
                          } catch {
                            return null
                          }
                        })()}
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-3 text-sm text-muted-foreground">{service.user.email}</td>

                  <td className="px-5 py-3 text-sm text-muted-foreground">{service.paidAmount || 0} ₽</td>

                  <td className="px-5 py-3">
                    <select
                      value={service.status}
                      onChange={(e) => changeStatus(service.id, e.target.value)}
                      className={`text-xs px-2.5 py-1 rounded-full ${
                        statusColors[service.status] || "bg-gray-500/20 text-gray-500"
                      } cursor-pointer border-0 focus:outline-none focus:ring-0`}
                      title="Изменить статус"
                    >
                      <option value="UNPAID">Не оплачен</option>
                      <option value="PENDING">Ожидание</option>
                      <option value="INSTALLING">Установка</option>
                      <option value="READY">Готов</option>
                      <option value="ACTIVE">Активен</option>
                      <option value="SUSPENDED">Приостановлен</option>
                      <option value="GRACE_PERIOD">Grace Period</option>
                    </select>
                  </td>

                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {service.expiresAt ? new Date(service.expiresAt).toLocaleDateString("ru-RU") : "—"}
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {serviceType === "dedicated" && (
                        <button
                          onClick={() => setReinstallModal(service)}
                          className="size-8 rounded-lg hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          title="Переустановка ОС"
                        >
                          <RotateCw className="size-4" />
                        </button>
                      )}

                      {service.status === "ACTIVE" && (
                        <button
                          onClick={() => suspendService(service.id, "suspend")}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
                        >
                          Suspend
                        </button>
                      )}

                      {service.status === "SUSPENDED" && (
                        <button
                          onClick={() => suspendService(service.id, "unsuspend")}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        >
                          Unsuspend
                        </button>
                      )}

                      <button
                        onClick={() => deleteService(service.id)}
                        className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
