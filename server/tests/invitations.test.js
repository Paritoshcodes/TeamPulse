import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app, User, Workspace, Team, Channel, Invitation, signToken, mongoServer;

// Helper for consistent dynamic imports under Node's vm modules
const dynamicImport = (p) => import(p);

beforeAll(async () => {
  const modApp = await dynamicImport('../src/app.js');
  app = modApp.default;
  ({ default: User } = await dynamicImport('../src/models/User.js'));
  ({ default: Workspace } = await dynamicImport('../src/models/Workspace.js'));
  ({ default: Team } = await dynamicImport('../src/models/Team.js'));
  ({ default: Channel } = await dynamicImport('../src/models/Channel.js'));
  ({ default: Invitation } = await dynamicImport('../src/models/Invitation.js'));
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

async function createUser(email, name = 'User') {
  const user = await User.create({ email: email.toLowerCase(), name, password: 'password', authProvider: 'local' });
  // Mark email as verified for testing (no need for OTP flow in invitation tests)
  user.emailVerification = { verified: true };
  await user.save();
  const token = signToken(user._id);
  return { user, token };
}

describe('Invitations and permissions', () => {
  test('workspace invite gives full access', async () => {
    const inviter = await createUser('a@example.com', 'Inviter A');
    const invitee = await createUser('b@example.com', 'Invitee B');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'WS1' })
      .expect(201);
    const workspaceId = wsRes.body.workspace._id;

    const t1 = await request(app)
      .post('/api/teams')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'Team One', workspaceId })
      .expect(201);
    const t2 = await request(app)
      .post('/api/teams')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'Team Two', workspaceId })
      .expect(201);

    const invRes = await request(app)
      .post('/api/invitations')
      .set('Cookie', `token=${inviter.token}`)
      .send({ inviteeEmail: invitee.user.email, scope: 'workspace', workspaceId })
      .expect(201);

    const invitationId = invRes.body.invitation._id;

    await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .set('Cookie', `token=${invitee.token}`)
      .expect(200);

    const teamsRes = await request(app)
      .get('/api/teams')
      .query({ workspaceId })
      .set('Cookie', `token=${invitee.token}`)
      .expect(200);
    expect(teamsRes.body.teams).toHaveLength(2);

    const ws = await Workspace.findById(workspaceId).lean();
    const mem = ws.members.find((m) => m.user.toString() === invitee.user._id.toString());
    expect(mem).toBeDefined();
    expect(mem.source).toBe('workspace');
  });

  test('team invite shows only that team', async () => {
    const inviter = await createUser('c@example.com', 'Inviter C');
    const invitee = await createUser('d@example.com', 'Invitee D');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'WS2' })
      .expect(201);
    const workspaceId = wsRes.body.workspace._id;

    const t1 = await request(app)
      .post('/api/teams')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'Alpha', workspaceId })
      .expect(201);
    const t2 = await request(app)
      .post('/api/teams')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'Beta', workspaceId })
      .expect(201);

    const invRes = await request(app)
      .post('/api/invitations')
      .set('Cookie', `token=${inviter.token}`)
      .send({ inviteeEmail: invitee.user.email, scope: 'team', teamId: t1.body.team._id })
      .expect(201);
    const invitationId = invRes.body.invitation._id;

    await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .set('Cookie', `token=${invitee.token}`)
      .expect(200);

    const teamsRes = await request(app)
      .get('/api/teams')
      .query({ workspaceId })
      .set('Cookie', `token=${invitee.token}`)
      .expect(200);
    expect(teamsRes.body.teams).toHaveLength(1);
    expect(teamsRes.body.teams[0]._id).toBe(t1.body.team._id);

    const ws = await Workspace.findById(workspaceId).lean();
    const mem = ws.members.find((m) => m.user.toString() === invitee.user._id.toString());
    expect(mem).toBeDefined();
    expect(mem.source).toBe('team');
  });

  test('channel invite shows only that channel', async () => {
    const inviter = await createUser('e@example.com', 'Inviter E');
    const invitee = await createUser('f@example.com', 'Invitee F');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'WS3' })
      .expect(201);
    const workspaceId = wsRes.body.workspace._id;

    const t1 = await request(app)
      .post('/api/teams')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'Gamma', workspaceId })
      .expect(201);
    const teamId = t1.body.team._id;

    const ch1 = await request(app)
      .post('/api/channels')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'general', type: 'text', teamId })
      .expect(201);
    const ch2 = await request(app)
      .post('/api/channels')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'private', type: 'text', teamId })
      .expect(201);

    const invRes = await request(app)
      .post('/api/invitations')
      .set('Cookie', `token=${inviter.token}`)
      .send({ inviteeEmail: invitee.user.email, scope: 'channel', channelId: ch2.body.channel._id })
      .expect(201);
    const invitationId = invRes.body.invitation._id;

    await request(app)
      .post(`/api/invitations/${invitationId}/accept`)
      .set('Cookie', `token=${invitee.token}`)
      .expect(200);

    const teamsRes = await request(app)
      .get('/api/teams')
      .query({ workspaceId })
      .set('Cookie', `token=${invitee.token}`)
      .expect(200);
    expect(teamsRes.body.teams).toHaveLength(1);
    expect(teamsRes.body.teams[0]._id).toBe(teamId);

    const channelsRes = await request(app)
      .get('/api/channels')
      .query({ teamId })
      .set('Cookie', `token=${invitee.token}`)
      .expect(200);
    expect(channelsRes.body.channels).toHaveLength(1);
    expect(channelsRes.body.channels[0]._id).toBe(ch2.body.channel._id);

    const ws = await Workspace.findById(workspaceId).lean();
    const mem = ws.members.find((m) => m.user.toString() === invitee.user._id.toString());
    expect(mem).toBeDefined();
    expect(mem.source).toBe('channel');
  });

  test('non-members get 403 for teams', async () => {
    const inviter = await createUser('g@example.com', 'Inviter G');
    const stranger = await createUser('h@example.com', 'Stranger H');

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Cookie', `token=${inviter.token}`)
      .send({ name: 'WS4' })
      .expect(201);
    const workspaceId = wsRes.body.workspace._id;

    await request(app)
      .get('/api/teams')
      .query({ workspaceId })
      .set('Cookie', `token=${stranger.token}`)
      .expect(403);
  });
});
