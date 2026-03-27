/**
 * ADMIN SETUP SCRIPT
 * ==================
 * Run this script ONCE in your browser console (or as a one-off React page)
 * to create the admin account in Firebase.
 *
 * OR: Use the AdminSetup page approach below — just manually call createAdminAccount()
 * from browser devtools after importing firebase.
 *
 * Steps:
 * 1. Open your deployed app
 * 2. Open browser console (F12)
 * 3. Paste the script below and run it
 *
 * NOTE: Replace ADMIN_EMAIL and ADMIN_PASSWORD with your desired admin credentials.
 */

// Paste in browser console after app loads:
/*
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from './src/firebase/config';

const ADMIN_EMAIL = 'admin@bccircle.com';   // Change this
const ADMIN_PASSWORD = 'Admin@12345';        // Change this
const ADMIN_NAME = 'Admin';                  // Change this

async function createAdmin() {
  const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
  await setDoc(doc(db, 'players', cred.user.uid), {
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    isAdmin: true,
    hasWon: true,  // Admin doesn't participate in bidding
    wonMonth: null,
    createdAt: new Date().toISOString()
  });
  console.log('✅ Admin created! UID:', cred.user.uid);
}

createAdmin().catch(console.error);
*/

// ─── ALTERNATIVE: Use this standalone HTML file ─────────────────────────────
// Save as create-admin.html, update firebase config, open in browser, click button.

export const ADMIN_SETUP_INSTRUCTIONS = `
1. Go to Firebase Console: https://console.firebase.google.com
2. Create a new project (or use existing)
3. Enable Authentication → Email/Password sign-in
4. Create Firestore Database (start in test mode initially)
5. Get your web app config (Project Settings → Apps)
6. Update src/firebase/config.js with your config
7. Create admin account using the script above
8. Log in with admin credentials
9. Go to /admin/setup to add players and configure group
10. Deploy to Netlify: connect GitHub repo → set build command: npm run build → publish dir: build
`;
