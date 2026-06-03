import { User, LoginActivity } from './types';
import { auth, googleProvider, db } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, signOut, sendPasswordResetEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, addDoc, updateDoc, query, where } from 'firebase/firestore';

const hashPassword = (password: string) => btoa(password);

const seedSuperAdmin = async () => {
  // Legacy function: We now handle Super Admin provisioning directly via Firebase Auth during login
};

export const authService = {
  initialize: () => {
    seedSuperAdmin();
  },
  
  register: async (email: string, password: string, role: 'BRAND_ADMIN' | 'CORPORATE_USER', brandId?: string, name?: string): Promise<User> => {
    // 1. Create string user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const fbUser = userCredential.user;

    // 2. Save custom roles to Firestore
    const userObj: any = {
      id: fbUser.uid,
      name: name || email.split('@')[0],
      email,
      role,
      needsPasswordChange: false
    };
    if (brandId) {
      userObj.brandId = brandId;
    }

    await setDoc(doc(db, "users", fbUser.uid), userObj);
    
    // Store in LocalStorage for synchronous parts of the app
    localStorage.setItem('user', JSON.stringify(userObj));
    return userObj;
  },

  login: async (email: string, role: 'SUPER_ADMIN' | 'BRAND_ADMIN' | 'CORPORATE_USER', password?: string): Promise<User> => {
    try {
      const isSuperEmail = role === 'SUPER_ADMIN' && ['superadmin@qwikmeal.com', 'sac00026@gmail.com'].includes(email.toLowerCase());
      let userCredential;

      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password || "");
      } catch (e: any) {
         if (isSuperEmail) {
            // Attempt to securely migrate from legacy default password
            try {
                const legacyCredential = await signInWithEmailAndPassword(auth, email, "Admin@123");
                if (legacyCredential && legacyCredential.user) {
                    await updatePassword(legacyCredential.user, "Admin@62676");
                    
                    // If the user entered the correctly updated password we let them through
                    if (password === "Admin@62676") {
                        userCredential = legacyCredential;
                    } else {
                        // Otherwise, they didn't enter the right password, so sign them out safely
                        await signOut(auth);
                        throw new Error('Invalid email or password.');
                    }
                }
            } catch (migrateErr: any) {
                // If migration fails, it might mean the user doesn't exist at all yet.
                // In that case, we provision them cleanly using Firebase's native flow.
                if (!userCredential && (migrateErr.code === 'auth/user-not-found' || migrateErr.code === 'auth/invalid-credential')) {
                    try {
                        userCredential = await createUserWithEmailAndPassword(auth, email, password || "Admin@62676");
                    } catch (createErr) {
                        // Fall back to throwing original error.
                    }
                }
            }
         }

         if (!userCredential) {
          if (e.code === 'auth/operation-not-allowed') {
            throw new Error('Email/Password sign-in is disabled in your Firebase console. Please go to Authentication > Sign-in methods and enable Email/Password.');
          }
          if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
            throw new Error('Invalid email or password.');
          }
          throw e;
        }
      }
      const fbUser = userCredential.user;

      // Ensure the role matches what is stored in firestore
      const userDoc = await getDoc(doc(db, "users", fbUser.uid));
      if (!userDoc.exists()) {
        if (isSuperEmail) {
           const newUserObj: User = {
             id: fbUser.uid,
             name: 'Super Admin',
             email,
             role: 'SUPER_ADMIN',
             needsPasswordChange: false
           };
           await setDoc(doc(db, "users", fbUser.uid), newUserObj);
           localStorage.setItem('user', JSON.stringify(newUserObj));
           return newUserObj;
        }

        if (role === 'CORPORATE_USER') {
           // Create a new document just to be safe if missing
           const newUserObj: User = {
             id: fbUser.uid,
             name: fbUser.displayName || email.split('@')[0],
             email,
             role: 'CORPORATE_USER',
             needsPasswordChange: false
           };
           await setDoc(doc(db, "users", fbUser.uid), newUserObj);
           localStorage.setItem('user', JSON.stringify(newUserObj));
           return newUserObj;
        }
        throw new Error('User not found in database.');
      }

      const userData = userDoc.data() as User;
      if (userData.role !== role) {
        await signOut(auth);
        throw new Error('Invalid account type selected.');
      }

      localStorage.setItem('user', JSON.stringify(userData));
      
      const { dbService } = await import('./db');
      const newActivity: LoginActivity = {
        id: `login_${Date.now()}`,
        userId: userData.id,
        userName: userData.name,
        userEmail: userData.email,
        role: userData.role,
        loginTime: new Date().toISOString(),
        userAgent: navigator.userAgent
      };
      try {
        await dbService.addLoginAudit(newActivity);
      } catch (e) {
        console.warn('Failed to sync login audit to Firebase', e);
      }
      localStorage.setItem('current_login_id', newActivity.id);
      
      return userData;

    } catch (e: any) {
      if (e.code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password sign-in is disabled in your Firebase console. Please go to Authentication > Sign-in methods and enable Email/Password.');
      }
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.');
      }
      throw e;
    }
  },

  signInWithGoogle: async (role: 'BRAND_ADMIN' | 'CORPORATE_USER', brandId?: string): Promise<User> => {
    let userCredential;
    try {
      userCredential = await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      if (e.code === 'auth/operation-not-allowed') {
        throw new Error('Google Sign-In is disabled in your Firebase console. Please go to Authentication > Sign-in methods and enable Google.');
      }
      if (e.code === 'auth/unauthorized-domain') {
        throw new Error('This app URL is not authorized in Firebase. Please add this URL to Authorized Domains in Firebase Authentication Settings.');
      }
      if (e.code === 'auth/popup-blocked') {
        throw new Error('Sign-In popup was blocked by your browser. Please allow popups or open the app in a new tab.');
      }
      if (e.code === 'auth/popup-closed-by-user') {
        throw new Error('Popup closed. Note: If you are in the AI Studio preview, Google Sign-In is often blocked in iframes. Please open the app in a new tab (click the ↗ icon top-right) and try again.');
      }
      if (e.message?.includes('Cross-Origin-Opener-Policy')) {
        throw new Error('Cross-Origin policy blocked the popup. Please open the app in a new completely separate tab/window (click the ↗ icon top-right).');
      }
      throw new Error(e.message || 'Google Sign-In failed');
    }
    const fbUser = userCredential.user;

    const userDocRef = doc(db, "users", fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    let userData: User;
    if (userDoc.exists()) {
       userData = userDoc.data() as User;
       if (userData.role !== role) {
         await signOut(auth);
         throw new Error('Invalid account type selected relative to your existing account.');
       }
    } else {
       // Registration via Google Provide
       const newUserData: any = {
         id: fbUser.uid,
         name: fbUser.displayName || fbUser.email!.split('@')[0],
         email: fbUser.email!,
         role,
         needsPasswordChange: false
       };
       if (brandId) newUserData.brandId = brandId;
       userData = newUserData as User;
       
       await setDoc(userDocRef, newUserData);
    }
    
    // Store in local storage for legacy synchronously calls
    localStorage.setItem('user', JSON.stringify(userData));
    
    const { dbService } = await import('./db');
    const newActivity: LoginActivity = {
      id: `login_${Date.now()}`,
      userId: userData.id,
      userName: userData.name,
      userEmail: userData.email,
      role: userData.role,
      loginTime: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    try {
      await dbService.addLoginAudit(newActivity);
    } catch (e) {
      console.warn('Failed to sync login audit to Firebase', e);
    }
    localStorage.setItem('current_login_id', newActivity.id);
    
    return userData;
  },
  
  changePassword: async (userId: string, currentPassword?: string, newPassword?: string) => {
    // If the third parameter is not provided, it means this was called from the old signature (like set needsPasswordChange modal).
    // Let's handle both.
    const actualOldPassword = newPassword === undefined ? null : currentPassword;
    const actualNewPassword = newPassword === undefined ? currentPassword! : newPassword;

    if (auth.currentUser) {
      if (actualOldPassword && auth.currentUser.email) {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, actualOldPassword);
        try {
          await reauthenticateWithCredential(auth.currentUser, credential);
        } catch (err: any) {
          throw new Error("Invalid current password.");
        }
      }
      
      await updatePassword(auth.currentUser, actualNewPassword);
      await updateDoc(doc(db, "users", userId), { needsPasswordChange: false });
      
      const currentUserStr = localStorage.getItem('user');
      if (currentUserStr) {
        let currentUser: User = JSON.parse(currentUserStr);
        currentUser.needsPasswordChange = false;
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    } else {
      throw new Error("Must be logged in to change password.");
    }
  },
  
  logout: async () => {
    const currentLoginId = localStorage.getItem('current_login_id');
    if (currentLoginId) {
      const { dbService } = await import('./db');
      await dbService.updateLoginAudit(currentLoginId, { logoutTime: new Date().toISOString() });
      localStorage.removeItem('current_login_id');
    }
    await signOut(auth);
    localStorage.removeItem('user');
  },
  
  getUser: (): User | null => {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('user');
  },
  
  sendPasswordReset: async (email: string) => {
    try {
      if (['superadmin@qwikmeal.com', 'sac00026@gmail.com'].includes(email.toLowerCase())) {
        throw new Error('Super Admin password cannot be reset this way.');
      }
      await sendPasswordResetEmail(auth, email);
    } catch (e: any) {
      if (e.code === 'auth/user-not-found') {
        throw new Error('No user found with this email.');
      }
      throw e;
    }
  }
};

// Seed on startup
authService.initialize();

