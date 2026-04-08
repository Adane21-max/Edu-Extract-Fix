import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ada21tech_salt").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(id: number, role: string): string {
  const payload = `${id}:${role}:${Date.now()}`;
  return Buffer.from(payload).toString("base64");
}

export function parseToken(token: string): { id: number; role: string } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [idStr, role] = decoded.split(":");
    const id = parseInt(idStr, 10);
    if (isNaN(id) || !role) return null;
    return { id, role };
  } catch {
    return null;
  }
}
