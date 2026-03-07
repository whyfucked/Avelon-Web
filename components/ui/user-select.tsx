"use client"

import { useState, useEffect } from 'react'
import { CustomSelect } from "@/components/admin/custom-select"
import { User, Shield, Search } from "lucide-react"

interface UserOption {
  id: string
  email: string
  name: string | null
  role: string
}

interface UserSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  type?: 'all' | 'users' | 'admins'
}

export function UserSelect({ 
  value, 
  onChange, 
  placeholder = "Все пользователи", 
  className, 
  disabled,
  type = 'all'
}: UserSelectProps) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
    setLoading(false)
  }

  const filteredUsers = users.filter(user => {
    if (type === 'users') return user.role === 'USER'
    if (type === 'admins') return user.role === 'ADMIN'
    return true
  })

  const options = [
    { 
      value: '', 
      label: placeholder, 
      icon: <User className="size-4 text-muted-foreground" /> 
    },
    ...filteredUsers.map(user => ({
      value: user.id,
      label: user.name || user.email.split('@')[0],
      sublabel: user.email,
      icon: user.role === 'ADMIN' 
        ? <Shield className="size-4 text-red-500" /> 
        : <User className="size-4 text-blue-500" />,
      group: user.role === 'ADMIN' ? 'Администраторы' : 'Пользователи'
    }))
  ]

  if (loading) {
    return (
      <div className="px-4 py-2 bg-background border border-border rounded-lg text-sm text-muted-foreground">
        Загрузка пользователей...
      </div>
    )
  }

  return (
    <CustomSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      searchable={true}
      clearable={true}
    />
  )
}