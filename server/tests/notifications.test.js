import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let app;
let User;
let Workspace;
let Team;
let Channel;
let Message;
let Notification;
let signToken;
let mongoServer;

const dynamicImport = (p) => import(p);

beforeAll(async () => {
  ({ default: app } = await dynamicImport('../src/app.js'));
  ({ default: User } = await dynamicImport('../src/models/User.js'));
  ({ default: Workspace } = await dynamicImport('../src/models/Workspace.js'));
  ({ default: Team } = await dynamicImport('../src/models/Team.js'));
  ({ default: Channel } = await dynamicImport('../src/models/Channel.js'));
  ({ default: Message } = await dynamicImport('../src/models/Message.js'));
  ({ default: Notification } = await dynamicImport('../src/models/Notification.js'));
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

async function createVerifiedUser({ email, name, username }) {
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: 'password',
    authProvider: 'local',
    username,
    emailVerification: { verified: true },
  });
  const token = signToken(user._id);
  return { user, token };
}

describe('Notification flows', () => {
  test('reply creates mention and reply notifications', async () => {
    const alice = await createVerifiedUser({
      email: 'alice@example.com',
      name: 'Alice',
      username: 'alice',
    });
    const bob = await createVerifiedUser({
      email: 'bob@example.com',
      name: 'Bob',
      username: 'bob',
    });
    const charlie = await createVerifiedUser({
      email: 'charlie@example.com',
      name: 'Charlie',
      username: 'charlie',
    });

    const wsRes = await request(app)
      .post('/api/workspaces')
      .set('Cookie', `token=${alice.token}`)
      .send({ name: 'Notify WS' })
      .expect(201);

    const workspaceId = wsRes.body.workspace._id;

    const teamRes = await request(app)
      .post('/api/teams')
      .set('Cookie', `token=${alice.token}`)
      .send({ name: 'General Team', workspaceId })
      .expect(201);

    const teamId = teamRes.body.team._id;

    const channelRes = await request(app)
      .post('/api/channels')
      .set('Cookie', `token=${alice.token}`)
      .send({ name: 'general', type: 'text', teamId })
      .expect(201);

    const channelId = channelRes.body.channel._id;

    // Add Bob and Charlie as workspace members so they can access the channel.
    const workspace = await Workspace.findById(workspaceId);
    workspace.members.push({ user: bob.user._id, role: 'member' });
    workspace.members.push({ user: charlie.user._id, role: 'member' });
    await workspace.save();

    const parent = await Message.create({
      channel: channelId,
      sender: alice.user._id,
      content: 'Original parent message',
    });

    await request(app)
      .post(`/api/messages/${parent._id}/reply`)
      .set('Cookie', `token=${bob.token}`)
      .send({ content: '@charlie please take a look' })
      .expect(201);

    const mentionNotifications = await Notification.find({
      recipient: charlie.user._id,
      type: 'mention',
    }).lean();

    const replyNotifications = await Notification.find({
      recipient: alice.user._id,
      type: 'reply',
    }).lean();

    expect(mentionNotifications).toHaveLength(1);
    expect(replyNotifications).toHaveLength(1);
  });

  test('connection request creates notification for receiver', async () => {
    const sender = await createVerifiedUser({
      email: 'sender@example.com',
      name: 'Sender',
      username: 'sender',
    });
    const receiver = await createVerifiedUser({
      email: 'receiver@example.com',
      name: 'Receiver',
      username: 'receiver',
    });

    await request(app)
      .post('/api/connections/request')
      .set('Cookie', `token=${sender.token}`)
      .send({ userId: receiver.user._id.toString() })
      .expect(200);

    const notifications = await Notification.find({
      recipient: receiver.user._id,
      type: 'connection_request',
    }).lean();

    expect(notifications).toHaveLength(1);
    expect(notifications[0].sender.toString()).toBe(sender.user._id.toString());
  });
});
