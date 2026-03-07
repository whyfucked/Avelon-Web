export type PublicPlanCategory = 'MINECRAFT' | 'CODING' | 'VDS'

export interface PublicGamePlan {
  key: string
  name: string
  mob: string | null
  customImg: string | null
  vcpu: number
  ramText: string
  diskText: string
  ramMb: number
  diskMb: number
  db: number | '∞'
  port: string
  backups: number
  price: number
  category: PublicPlanCategory
}

export const publicGamePlans: PublicGamePlan[] = [
  { key: 'mc-bee', name: 'Пчела - FREE', mob: null, customImg: 'https://mcheads.ru/heads/medium/front/xcft.png', vcpu: 1.5, ramText: '4 ГБ', diskText: '15 ГБ', ramMb: 4096, diskMb: 15360, db: 1, port: '1 Гбит/с', backups: 3, price: 0, category: 'MINECRAFT' },
  { key: 'mc-creeper', name: 'Крипер', mob: 'MHF_Creeper', customImg: null, vcpu: 1, ramText: '2 ГБ', diskText: '40 ГБ', ramMb: 2048, diskMb: 40960, db: 1, port: '1 Гбит/с', backups: 6, price: 60, category: 'MINECRAFT' },
  { key: 'mc-zombie', name: 'Зомби', mob: 'MHF_Zombie', customImg: null, vcpu: 3, ramText: '4 ГБ', diskText: '60 ГБ', ramMb: 4096, diskMb: 61440, db: 2, port: '1 Гбит/с', backups: 6, price: 132, category: 'MINECRAFT' },
  { key: 'mc-spider', name: 'Паук', mob: 'MHF_Spider', customImg: null, vcpu: 3, ramText: '6 ГБ', diskText: '80 ГБ', ramMb: 6144, diskMb: 81920, db: 3, port: '1 Гбит/с', backups: 6, price: 176, category: 'MINECRAFT' },
  { key: 'mc-skeleton', name: 'Скелет', mob: 'MHF_Skeleton', customImg: null, vcpu: 4, ramText: '8 ГБ', diskText: '100 ГБ', ramMb: 8192, diskMb: 102400, db: 5, port: '1 Гбит/с', backups: 6, price: 220, category: 'MINECRAFT' },
  { key: 'mc-slime', name: 'Слизень', mob: 'MHF_Slime', customImg: null, vcpu: 4, ramText: '10 ГБ', diskText: '120 ГБ', ramMb: 10240, diskMb: 122880, db: '∞', port: '1 Гбит/с', backups: 6, price: 286, category: 'MINECRAFT' },
  { key: 'mc-enderman', name: 'Эндермен', mob: 'MHF_Enderman', customImg: null, vcpu: 5, ramText: '12 ГБ', diskText: '150 ГБ', ramMb: 12288, diskMb: 153600, db: '∞', port: '1 Гбит/с', backups: 6, price: 374, category: 'MINECRAFT' },
  { key: 'mc-witch', name: 'Ведьма', mob: null, customImg: 'https://mcheads.ru/heads/medium/front/epve.png', vcpu: 6, ramText: '16 ГБ', diskText: '180 ГБ', ramMb: 16384, diskMb: 184320, db: '∞', port: '1 Гбит/с', backups: 6, price: 484, category: 'MINECRAFT' },
  { key: 'mc-blaze', name: 'Блейз', mob: 'MHF_Blaze', customImg: null, vcpu: 8, ramText: '20 ГБ', diskText: '220 ГБ', ramMb: 20480, diskMb: 225280, db: '∞', port: '1 Гбит/с', backups: 6, price: 616, category: 'MINECRAFT' },
  { key: 'mc-ghast', name: 'Гаст', mob: 'MHF_Ghast', customImg: null, vcpu: 10, ramText: '24 ГБ', diskText: '240 ГБ', ramMb: 24576, diskMb: 245760, db: '∞', port: '1 Гбит/с', backups: 6, price: 770, category: 'MINECRAFT' },
  { key: 'mc-wither', name: 'Визер', mob: 'MHF_WSkeleton', customImg: null, vcpu: 12, ramText: '28 ГБ', diskText: '256 ГБ', ramMb: 28672, diskMb: 262144, db: '∞', port: '1 Гбит/с', backups: 6, price: 946, category: 'MINECRAFT' },
]


