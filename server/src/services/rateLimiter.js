import Redis from 'ioredis';

const COOLDOWN_MS = parseInt(process.env.OTP_SEND_COOLDOWN_MS || '60000', 10);
const MAX_PER_HOUR = parseInt(process.env.OTP_SEND_MAX_PER_HOUR || '5', 10);
const RESET_COOLDOWN_MS = parseInt(process.env.RESET_SEND_COOLDOWN_MS || '60000', 10);
const RESET_MAX_PER_HOUR = parseInt(process.env.RESET_SEND_MAX_PER_HOUR || '5', 10);

let redis = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

// In-memory fallback
const otpSendMap = new Map();
const resetSendMap = new Map();

export async function canSendOtp(userId) {
  const now = Date.now();
  if (!redis) {
    // in-memory
    let rec = otpSendMap.get(userId);
    if (!rec) {
      rec = { count: 0, firstAt: now, lastAt: 0 };
      otpSendMap.set(userId, rec);
    }
    if (now - rec.firstAt > 60 * 60 * 1000) {
      rec.count = 0;
      rec.firstAt = now;
    }
    if (now - rec.lastAt < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - (now - rec.lastAt)) / 1000);
      return { ok: false, reason: 'cooldown', retryAfter };
    }
    if (rec.count >= MAX_PER_HOUR) {
      return { ok: false, reason: 'limit' };
    }
    rec.count += 1;
    rec.lastAt = now;
    otpSendMap.set(userId, rec);
    return { ok: true };
  }

  // Redis-backed
  const keyCount = `otp:count:${userId}`;
  const keyLast = `otp:last:${userId}`;

  const lastAt = await redis.get(keyLast);
  if (lastAt && now - parseInt(lastAt, 10) < COOLDOWN_MS) {
    const retryAfter = Math.ceil((COOLDOWN_MS - (now - parseInt(lastAt, 10))) / 1000);
    return { ok: false, reason: 'cooldown', retryAfter };
  }

  const count = await redis.incr(keyCount);
  if (count === 1) {
    await redis.expire(keyCount, 60 * 60);
  }
  if (count > MAX_PER_HOUR) {
    return { ok: false, reason: 'limit' };
  }
  // set last timestamp
  await redis.set(keyLast, String(now));
  return { ok: true };
}

export async function canSendPasswordReset(userId) {
  const now = Date.now();
  if (!redis) {
    let rec = resetSendMap.get(userId);
    if (!rec) {
      rec = { count: 0, firstAt: now, lastAt: 0 };
      resetSendMap.set(userId, rec);
    }
    if (now - rec.firstAt > 60 * 60 * 1000) {
      rec.count = 0;
      rec.firstAt = now;
    }
    if (now - rec.lastAt < RESET_COOLDOWN_MS) {
      const retryAfter = Math.ceil((RESET_COOLDOWN_MS - (now - rec.lastAt)) / 1000);
      return { ok: false, reason: 'cooldown', retryAfter };
    }
    if (rec.count >= RESET_MAX_PER_HOUR) {
      return { ok: false, reason: 'limit' };
    }
    rec.count += 1;
    rec.lastAt = now;
    resetSendMap.set(userId, rec);
    return { ok: true };
  }

  const keyCount = `reset:count:${userId}`;
  const keyLast = `reset:last:${userId}`;

  const lastAt = await redis.get(keyLast);
  if (lastAt && now - parseInt(lastAt, 10) < RESET_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESET_COOLDOWN_MS - (now - parseInt(lastAt, 10))) / 1000);
    return { ok: false, reason: 'cooldown', retryAfter };
  }

  const count = await redis.incr(keyCount);
  if (count === 1) {
    await redis.expire(keyCount, 60 * 60);
  }
  if (count > RESET_MAX_PER_HOUR) {
    return { ok: false, reason: 'limit' };
  }

  await redis.set(keyLast, String(now));
  return { ok: true };
}

export function resetForTests() {
  otpSendMap.clear();
  resetSendMap.clear();
}

export default {
  canSendOtp,
  canSendPasswordReset,
  resetForTests,
};
