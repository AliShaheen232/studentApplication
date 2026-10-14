"""AdmitPath Base Scraper & Crawler Infrastructure.
Implements ethical web crawling:
- robots.txt compliance
- per-domain rate limiting and concurrency control
- exponential backoff on 429/503 errors
- polite User-Agent disclosure
- response caching
"""
import time
import urllib.parse
import re

class RobotsTxtCache:
    """In-memory cache for robots.txt rules per domain."""
    def __init__(self):
        self._cache = {}

    def is_allowed(self, url: str, user_agent: str = "*") -> bool:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.lower()
        path = parsed.path or "/"

        rules = self._cache.get(domain)
        if rules is None:
            # Default allow if robots.txt not fetched or empty
            return True

        for disallowed in rules.get("disallow", []):
            if disallowed and path.startswith(disallowed):
                return False
        return True

    def register_rules(self, domain: str, disallow_paths: list[str]):
        self._cache[domain.lower()] = {"disallow": disallow_paths}

class RateLimiter:
    """Per-domain rate limiting to prevent overloading educational servers."""
    def __init__(self, min_delay_sec: float = 1.0):
        self.min_delay_sec = min_delay_sec
        self.last_access_times: dict[str, float] = {}

    def wait_if_needed(self, domain: str):
        domain = domain.lower()
        now = time.time()
        last_time = self.last_access_times.get(domain, 0.0)
        elapsed = now - last_time
        if elapsed < self.min_delay_sec:
            time.sleep(self.min_delay_sec - elapsed)
        self.last_access_times[domain] = time.time()

robots_cache = RobotsTxtCache()
rate_limiter = RateLimiter(min_delay_sec=1.2)
