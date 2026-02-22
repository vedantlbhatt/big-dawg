"""
In-memory cache manager for Polymarket data with TTL support.
Reduces API calls and improves response times significantly.
"""
import time
import threading
from typing import Any, Optional, Tuple

class TTLCache:
    """Thread-safe in-memory cache with time-to-live (TTL) for each entry."""
    
    def __init__(self):
        self._store = {}
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value if key exists and hasn't expired."""
        with self._lock:
            if key not in self._store:
                return None
            
            value, expiry = self._store[key]
            if time.time() > expiry:
                del self._store[key]
                return None
            
            return value
    
    def set(self, key: str, value: Any, ttl: int) -> None:
        """Set value with TTL in seconds."""
        with self._lock:
            expiry = time.time() + ttl
            self._store[key] = (value, expiry)
    
    def clear(self) -> None:
        """Clear all cached entries."""
        with self._lock:
            self._store.clear()
    
    def cleanup_expired(self) -> int:
        """Remove expired entries and return count removed."""
        with self._lock:
            now = time.time()
            expired = [k for k, (_, exp) in self._store.items() if now > exp]
            for k in expired:
                del self._store[k]
            return len(expired)

# Global cache instances
_markets_cache = TTLCache()
_trades_cache = TTLCache()
_scout_cache = TTLCache()

# Cache TTLs (in seconds)
MARKETS_CACHE_TTL = 300  # 5 minutes - market list doesn't change often
TRADES_CACHE_TTL = 600   # 10 minutes - trade data updates regularly
SCOUT_CACHE_TTL = 900    # 15 minutes - analysis results are heavy

def get_cached_markets() -> Optional[Any]:
    """Retrieve cached markets list."""
    return _markets_cache.get("markets")

def set_cached_markets(df, ttl: int = MARKETS_CACHE_TTL) -> None:
    """Cache markets dataframe."""
    _markets_cache.set("markets", df, ttl)

def get_cached_trades(key: str) -> Optional[Any]:
    """Retrieve cached trade data for a market."""
    return _trades_cache.get(f"trades:{key}")

def set_cached_trades(key: str, df, ttl: int = TRADES_CACHE_TTL) -> None:
    """Cache trade data for a market."""
    _trades_cache.set(f"trades:{key}", df, ttl)

def get_cached_scout(key: str) -> Optional[Any]:
    """Retrieve cached scout data."""
    return _scout_cache.get(f"scout:{key}")

def set_cached_scout(key: str, data, ttl: int = SCOUT_CACHE_TTL) -> None:
    """Cache scout analysis data."""
    _scout_cache.set(f"scout:{key}", data, ttl)

def clear_all_caches() -> None:
    """Emergency cache clear."""
    _markets_cache.clear()
    _trades_cache.clear()
    _scout_cache.clear()

def cache_stats() -> dict:
    """Get cache statistics for monitoring."""
    return {
        "markets": len(_markets_cache._store),
        "trades": len(_trades_cache._store),
        "scout": len(_scout_cache._store),
    }
