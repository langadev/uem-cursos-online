/**
 * Firebase Mock - Para evitar erros de importação
 * Todo o código agora usa MySQL + JWT
 */

export const db = null;
export const storage = null;
export const auth = null;

export const collection = () => null;
export const query = () => null;
export const where = () => null;
export const onSnapshot = () => () => {};
export const getDocs = async () => ({ docs: [] });
export const doc = () => null;
export const setDoc = async () => {};
export const updateDoc = async () => {};
export const deleteDoc = async () => {};
export const serverTimestamp = () => null;
export const Timestamp = { now: () => null };

export const getDownloadURL = async () => "";
export const uploadBytes = async () => null;
export const ref = () => null;

export const updateProfile = async () => {};
export const signOut = async () => {};

export default {
  db,
  storage,
  auth,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
};
