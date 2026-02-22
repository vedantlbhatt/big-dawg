"""
Analysis timing tracker - measures actual analysis performance.
Maintains rolling average of analysis times for dashboard statistics.
"""
import time
from collections import deque
from threading import Lock

class AnalysisTimer:
    """Thread-safe tracker for analysis timing statistics."""
    
    def __init__(self, max_samples: int = 50):
        """Initialize with max rolling window size."""
        self._times = deque(maxlen=max_samples)
        self._lock = Lock()
    
    def record_time(self, duration_ms: float) -> None:
        """Record an analysis duration in milliseconds."""
        with self._lock:
            self._times.append(float(duration_ms))
    
    def get_average(self) -> float:
        """Get average analysis time in milliseconds."""
        with self._lock:
            if not self._times:
                return 0
            return sum(self._times) / len(self._times)
    
    def get_percentile(self, p: int) -> float:
        """Get Pth percentile of analysis times."""
        with self._lock:
            if not self._times:
                return 0
            sorted_times = sorted(self._times)
            idx = max(0, int(len(sorted_times) * (p / 100)) - 1)
            return sorted_times[idx]
    
    def get_count(self) -> int:
        """Get number of recorded samples."""
        with self._lock:
            return len(self._times)
    
    def get_stats(self) -> dict:
        """Get comprehensive timing statistics."""
        with self._lock:
            if not self._times:
                return {
                    "avg": 0,
                    "min": 0,
                    "max": 0,
                    "p50": 0,
                    "p95": 0,
                    "count": 0
                }
            
            sorted_times = sorted(self._times)
            return {
                "avg": sum(self._times) / len(self._times),
                "min": min(self._times),
                "max": max(self._times),
                "p50": sorted_times[len(sorted_times) // 2],
                "p95": sorted_times[max(0, int(len(sorted_times) * 0.95) - 1)],
                "count": len(self._times)
            }

# Global timer instance
analysis_timer = AnalysisTimer(max_samples=100)

def format_time_stat(ms: float) -> str:
    """Format milliseconds as human-readable stat."""
    if ms < 1:
        return f"{ms*1000:.0f}μs"
    elif ms < 1000:
        return f"{ms:.0f}ms"
    else:
        return f"{ms/1000:.1f}s"
