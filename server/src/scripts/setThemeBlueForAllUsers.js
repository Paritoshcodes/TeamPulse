import 'dotenv/config';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';

async function run() {
  await connectDB();

  const result = await User.updateMany(
    { 'settings.appearance.theme': { $ne: 'blue' } },
    { $set: { 'settings.appearance.theme': 'blue' } }
  );

  const matched = result.matchedCount ?? result.n ?? 0;
  const modified = result.modifiedCount ?? result.nModified ?? 0;
  console.log(`[Theme] Matched: ${matched}, Updated: ${modified}`);

  await disconnectDB();
}

run().catch(async (err) => {
  console.error('[Theme] Failed to update themes:', err);
  await disconnectDB();
  process.exit(1);
});
