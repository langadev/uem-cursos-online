/**
 * Firebase Service - DESATIVADO
 * Sistema agora usa MySQL + JWT apenas
 * Este ficheiro é mantido para compatibilidade com imports existentes
 * mas todos os valores são nulos/vazios
 */

// Mock objects para evitar erros de tipos
export const db = null;
export const storage = null;
export const auth = null;
export const googleProvider = null;

export const collection = () => null;
export const query = () => null;
export const where = () => null;
export const onSnapshot = () => () => {};
export const getDocs = async () => ({ docs: [] });
export const doc = () => null;
export const setDoc = async () => {};
export const serverTimestamp = () => null;
export const limit = () => null;

export default null;
