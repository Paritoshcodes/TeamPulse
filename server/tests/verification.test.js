// Set OTP send limits for fast tests
// Disable cooldown to reliably test hourly max in CI/test environment
process.env.OTP_SEND_COOLDOWN_MS = '0';
process.env.OTP_SEND_MAX_PER_HOUR = '2';

// Capture sent emails via emailService event for tests (when running in-memory queue)
import emailService from '../src/services/emailService.js';
let sentMails = [];
emailService.onMailSent((data) => sentMails.push(data));


import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

let app, User, signToken, mongoServer;

// When running under Jest we rely on experimental vm modules enabled by the
// test runner. Guard dynamic import usage so the test file works both when
// executed directly and when run under Jest's ESM environment.
const dynamicImport = (p) => import(p);

beforeAll(async () => {
  const modApp = await dynamicImport('../src/app.js');
  app = modApp.default;
  ({ default: User } = await dynamicImport('../src/models/User.js'));
  ({ signToken } = await dynamicImport('../src/middleware/auth.middleware.js'));

  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  const colls = Object.keys(mongoose.connection.collections);
  for (const name of colls) {
    await mongoose.connection.collections[name].deleteMany({});
  }
});

async function createUser(email) {
  const u = await User.create({ name: 'T', email, password: 'password', authProvider: 'local' });
  const token = signToken(u._id);
  return { u, token };
}

describe('Email verification OTP', () => {
  test('send-otp sets otp and expiry', async () => {
    const { u, token } = await createUser('otp1@example.com');
    const res = await request(app).post('/api/auth/send-otp').set('Cookie', `token=${token}`).expect(200);
    expect(res.body.success).toBe(true);
    const user = await User.findById(u._id).select('+emailVerification.otp').lean();
    expect(user.emailVerification).toBeDefined();
    expect(user.emailVerification.expiresAt).toBeDefined();
    expect(user.emailVerification.verified).toBe(false);
    expect(user.emailVerification.otp).toBeDefined();
  });

  test('verify-email success and failure and expiry', async () => {
    const { u, token } = await createUser('otp2@example.com');
    const otp = '123456';
    const hashed = await bcrypt.hash(otp, 12);
    u.emailVerification = { otp: hashed, expiresAt: new Date(Date.now() + 5 * 60000), verified: false };
    await u.save();

    await request(app).post('/api/auth/verify-email').set('Cookie', `token=${token}`).send({ otp: '000000' }).expect(400);

    const ok = await request(app).post('/api/auth/verify-email').set('Cookie', `token=${token}`).send({ otp }).expect(200);
    expect(ok.body.success).toBe(true);

    const updated = await User.findById(u._id).lean();
    expect(updated.emailVerification.verified).toBe(true);

    const { u: u2, token: t2 } = await createUser('otp3@example.com');
    const otp2 = '222222';
    const hashed2 = await bcrypt.hash(otp2, 12);
    u2.emailVerification = { otp: hashed2, expiresAt: new Date(Date.now() - 1000), verified: false };
    await u2.save();
    await request(app).post('/api/auth/verify-email').set('Cookie', `token=${t2}`).send({ otp: otp2 }).expect(400);
  });

  test('send-otp is rate limited', async () => {
    const { token } = await createUser('rate1@example.com');
    // test hourly max: two sends allowed, third blocked
    await request(app).post('/api/auth/send-otp').set('Cookie', `token=${token}`).expect(200);
    await request(app).post('/api/auth/send-otp').set('Cookie', `token=${token}`).expect(200);
    // next send exceeds hourly max (2)
    await request(app).post('/api/auth/send-otp').set('Cookie', `token=${token}`).expect(429);
  });
});
