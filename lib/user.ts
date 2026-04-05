import { getDb } from './db'
import { SIGNUP_BONUS_CREDITS } from './quota'

export function upsertUser(user: {
  id: string
  email: string
  name?: string | null
  image?: string | null
}) {
  const db = getDb()

  // 检查是否已存在
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(user.id)

  if (!existing) {
    // 新用户：插入并赠送注册积分
    db.prepare(`
      INSERT INTO users (id, email, name, image, credits)
      VALUES (?, ?, ?, ?, ?)
    `).run(user.id, user.email, user.name ?? null, user.image ?? null, SIGNUP_BONUS_CREDITS)
  } else {
    // 老用户：更新资料
    db.prepare(`
      UPDATE users SET email = ?, name = ?, image = ? WHERE id = ?
    `).run(user.email, user.name ?? null, user.image ?? null, user.id)
  }
}

export function getUser(id: string) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as any
}
