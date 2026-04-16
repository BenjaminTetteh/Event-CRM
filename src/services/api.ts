import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  limit,
  where,
  setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Leads
export const getLeads = async () => {
  const path = 'leads';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

/**
 * Saves the Public Intake Form data into a leads collection.
 */
export const addLead = async (data: any) => {
  const path = 'leads';
  try {
    const newLead = { 
      ...data, 
      status: 'new',
      createdAt: new Date().toISOString() 
    };
    const docRef = await addDoc(collection(db, path), newLead);
    await logActivity('lead', 'Created Lead', `New lead from ${newLead.clientName}`);
    return { id: docRef.id, ...newLead };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

/**
 * Legacy alias for addLead
 */
export const createLead = async (lead: any, inspirationFile?: File) => {
  let inspirationLink = lead.inspirationLink || '';
  if (inspirationFile) {
    inspirationLink = await uploadInspiration(inspirationFile);
  }
  return addLead({ ...lead, inspirationLink });
};

export const updateLead = async (id: string, lead: any) => {
  const path = `leads/${id}`;
  try {
    const docRef = doc(db, 'leads', id);
    await updateDoc(docRef, lead);
    await logActivity('lead', 'Updated Lead', `Lead status: ${lead.status || 'updated'}`);
    return { id, ...lead };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteLead = async (id: string) => {
  const path = `leads/${id}`;
  try {
    await deleteDoc(doc(db, 'leads', id));
    await logActivity('lead', 'Deleted Lead', `Lead ID: ${id}`);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Inventory
export const getInventory = async () => {
  const path = 'inventory';
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const createInventoryItem = async (item: any) => {
  const path = 'inventory';
  try {
    const docRef = await addDoc(collection(db, path), item);
    await logActivity('inventory', 'Added Inventory Item', `Item: ${item.name}`);
    return { id: docRef.id, ...item };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateInventoryItem = async (id: string, item: any) => {
  const path = `inventory/${id}`;
  try {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, item);
    await logActivity('inventory', 'Updated Inventory Item', `Item: ${item.name}`);
    return { id, ...item };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteInventoryItem = async (id: string) => {
  const path = `inventory/${id}`;
  try {
    await deleteDoc(doc(db, 'inventory', id));
    await logActivity('inventory', 'Deleted Inventory Item', `Item ID: ${id}`);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Packages
export const getPackages = async () => {
  const path = 'packages';
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const createPackage = async (pkg: any) => {
  const path = 'packages';
  try {
    const docRef = await addDoc(collection(db, path), pkg);
    await logActivity('inventory', 'Created Package', `Package: ${pkg.name}`);
    return { id: docRef.id, ...pkg };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updatePackage = async (id: string, pkg: any) => {
  const path = `packages/${id}`;
  try {
    const docRef = doc(db, 'packages', id);
    await updateDoc(docRef, pkg);
    await logActivity('inventory', 'Updated Package', `Package: ${pkg.name}`);
    return { id, ...pkg };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deletePackage = async (id: string) => {
  const path = `packages/${id}`;
  try {
    await deleteDoc(doc(db, 'packages', id));
    await logActivity('inventory', 'Deleted Package', `Package ID: ${id}`);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Quotes
export const getQuotes = async () => {
  const path = 'quotes';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getQuote = async (id: string) => {
  const path = `quotes/${id}`;
  try {
    const docSnap = await getDoc(doc(db, 'quotes', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const createQuote = async (quote: any) => {
  const path = 'quotes';
  try {
    const newQuote = { ...quote, createdAt: new Date().toISOString() };
    const docRef = await addDoc(collection(db, path), newQuote);
    await logActivity('quote', 'Generated Quote', `Status: ${newQuote.status}`);
    return { id: docRef.id, ...newQuote };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateQuote = async (id: string, quote: any) => {
  const path = `quotes/${id}`;
  try {
    const docRef = doc(db, 'quotes', id);
    const updatedQuote = { ...quote, updatedAt: new Date().toISOString() };
    await updateDoc(docRef, updatedQuote);
    await logActivity('quote', 'Updated Quote', `Status: ${updatedQuote.status}`);
    return { id, ...updatedQuote };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteQuote = async (id: string) => {
  const path = `quotes/${id}`;
  try {
    await deleteDoc(doc(db, 'quotes', id));
    await logActivity('quote', 'Deleted Quote', `Quote ID: ${id}`);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

/**
 * Updates a Quote status (e.g., from 'draft' to 'quote' to 'invoice' to 'paid').
 */
export const updateQuoteStatus = async (id: string, status: string) => {
  return updateQuote(id, { status });
};

// Dashboard Stats
export const getDashboardStats = async () => {
  try {
    const [leads, quotes, inventory] = await Promise.all([
      getLeads(),
      getQuotes(),
      getInventory()
    ]);
    
    const revenue = (quotes || [])
      .filter((q: any) => q.status === 'paid')
      .reduce((sum: number, q: any) => sum + (q.totalAmount || 0), 0);
      
    const activeQuotes = (quotes || []).filter((q: any) => q.status !== 'paid').length;

    return {
      stats: {
        totalLeads: (leads || []).length,
        activeQuotes,
        totalInventory: (inventory || []).length,
        revenue
      },
      recentLeads: (leads || []).slice(0, 5)
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      stats: { totalLeads: 0, activeQuotes: 0, totalInventory: 0, revenue: 0 },
      recentLeads: []
    };
  }
};

// Settings
export const getSettings = async () => {
  const path = 'settings';
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const updateSetting = async (key: string, value: any) => {
  const path = `settings/${key}`;
  try {
    const docRef = doc(db, 'settings', key);
    await setDoc(docRef, { key, value }, { merge: true });
    await logActivity('settings', 'Updated Setting', `Key: ${key}`);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Users
export const getUsers = async () => {
  const path = 'users';
  try {
    const snapshot = await getDocs(collection(db, path));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const getUserProfile = async (userId: string) => {
  const path = `users/${userId}`;
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const updateUserRole = async (userId: string, role: string) => {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { role });
    await logActivity('user', 'Updated User Role', `User ID: ${userId}, New Role: ${role}`);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteUser = async (userId: string) => {
  const path = `users/${userId}`;
  try {
    await deleteDoc(doc(db, 'users', userId));
    await logActivity('user', 'Removed User', `User ID: ${userId}`);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const updateUserProfile = async (userId: string, data: { displayName?: string; photoURL?: string }) => {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, data);
    await logActivity('user', 'Updated Profile', `User ID: ${userId}`);
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const syncUser = async (user: any) => {
  if (!user) return null;
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const userData = {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString()
    };

    if (!userSnap.exists()) {
      // Check if this is the bootstrap admin
      const role = user.email === 'benjamintetteh@gmail.com' ? 'admin' : 'viewer';
      const newUser = { ...userData, role, createdAt: new Date().toISOString() };
      await setDoc(userRef, newUser);
      await logActivity('user', 'New User Registered', `Email: ${user.email}`);
      return newUser;
    } else {
      await updateDoc(userRef, userData);
      return { ...userSnap.data(), ...userData };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Activity Logs
/**
 * Uploads a file to a folder named client-briefs/ and returns a download URL.
 */
export const uploadInspiration = async (file: File) => {
  const path = `client-briefs/${Date.now()}_${file.name}`;
  try {
    const storageRef = ref(storage, path);
    const uploadResult = await uploadBytes(storageRef, file);
    return await getDownloadURL(uploadResult.ref);
  } catch (error) {
    console.error('Error uploading inspiration:', error);
    throw error;
  }
};

export const logActivity = async (category: string, action: string, details?: string) => {
  const path = 'activity_logs';
  try {
    const user = auth.currentUser;
    if (!user) return;

    const log = {
      userId: user.uid,
      userName: user.displayName || user.email || 'Unknown User',
      category,
      action,
      details: details || '',
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, path), log);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

export const getActivityLogs = async (limitCount: number = 50) => {
  const path = 'activity_logs';
  try {
    const q = query(
      collection(db, path), 
      orderBy('createdAt', 'desc'), 
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};
