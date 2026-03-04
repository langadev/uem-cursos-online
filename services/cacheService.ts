/**
 * Cache Service com localStorage
 * Armazena dados localmente para evitar requisições constantes ao Firebase
 * TTL (Time To Live) configurável
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // em milissegundos
}

class CacheService {
  private prefix = "cemoque_cache_";

  /**
   * Salva dados no cache com TTL
   * @param key Chave única do cache
   * @param data Dados a armazenar
   * @param ttlMinutes Tempo de vida em minutos (padrão: 30 min)
   */
  set<T>(key: string, data: T, ttlMinutes: number = 30): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000, // converte para ms
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      console.warn(`Erro ao salvar cache (${key}):`, error);
    }
  }

  /**
   * Recupera dados do cache se válido
   * @param key Chave do cache
   * @returns Dados ou null se expirado/não encontrado
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);
      const now = Date.now();
      const elapsed = now - entry.timestamp;

      // Se expirou, remove e retorna null
      if (elapsed > entry.ttl) {
        localStorage.removeItem(this.prefix + key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn(`Erro ao recuperar cache (${key}):`, error);
      return null;
    }
  }

  /**
   * Verifica se cache existe e é válido
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove um item específico do cache
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn(`Erro ao remover cache (${key}):`, error);
    }
  }

  /**
   * Limpa todo o cache da aplicação
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      console.log("Cache limpo com sucesso");
    } catch (error) {
      console.warn("Erro ao limpar cache:", error);
    }
  }

  /**
   * Obtém informações do cache
   */
  getStats(): { count: number; keys: string[] } {
    try {
      const keys = Object.keys(localStorage)
        .filter((k) => k.startsWith(this.prefix))
        .map((k) => k.replace(this.prefix, ""));
      return { count: keys.length, keys };
    } catch {
      return { count: 0, keys: [] };
    }
  }
}

export const cacheService = new CacheService();
