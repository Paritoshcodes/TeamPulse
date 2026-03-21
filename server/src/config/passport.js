/**
 * Passport Google OAuth strategy – find or create user by Google profile
 */
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const name = profile.displayName || profile.name?.givenName || 'User';
          const avatar = profile.photos?.[0]?.value || null;
          let user = await User.findOne({ email });
          if (user) {
            if (user.authProvider !== 'google') {
              return done(null, false, { message: 'Email already registered with another method' });
            }
            if (avatar) user.avatar = avatar;
            if (name) user.name = name;
            await user.save();
          } else {
            user = await User.create({
              name,
              email,
              avatar,
              authProvider: 'google',
              role: 'member',
            });
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

export default passport;
