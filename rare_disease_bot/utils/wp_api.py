"""WordPress API Fallback Utilities"""
from typing import List, Dict, Optional
from urllib.parse import urlparse
import json

try:
    # Python 3
    from urllib.request import urlopen
except ImportError:
    # Fallback for very old environments
    from urllib2 import urlopen  # type: ignore

from rich.console import Console
from .helpers import clean_html

console = Console()


def _site_root(base_url: str) -> str:
    """Derive site root (scheme + host) from any URL."""
    parsed = urlparse(base_url)
    scheme = parsed.scheme or "https"
    netloc = parsed.netloc
    return f"{scheme}://{netloc}"


def _fetch_json(url: str) -> Optional[object]:
    """Fetch JSON from a URL using stdlib."""
    try:
        with urlopen(url) as resp:
            if resp.getcode() != 200:
                console.log(f"[yellow]⚠️  WP API 非 200 响应: {resp.getcode()}[/yellow]")
                return None
            data = resp.read()
            return json.loads(data.decode("utf-8"))
    except Exception as e:
        console.log(f"[yellow]⚠️  WP API 请求失败: {e}[/yellow]")
        return None


def fetch_wp_posts(base_url: str, per_page: int = 20) -> List[Dict]:
    """Fetch recent WordPress posts via REST API.

    Returns a simplified list of dicts with keys:
    - link, title_html, date, content_html, categories_ids, author_id
    """
    root = _site_root(base_url)
    api_url = f"{root}/wp-json/wp/v2/posts?per_page={per_page}"
    posts = _fetch_json(api_url)
    if not isinstance(posts, list):
        return []

    simplified: List[Dict] = []
    for p in posts:
        try:
            simplified.append({
                "link": p.get("link"),
                "title_html": (p.get("title") or {}).get("rendered", ""),
                "date": (p.get("date") or "").split("T")[0],
                "content_html": (p.get("content") or {}).get("rendered", ""),
                "categories_ids": p.get("categories") or [],
                "author_id": p.get("author"),
            })
        except Exception:
            # Skip malformed posts
            continue

    # Optionally resolve category names
    ids = sorted({cid for p in simplified for cid in (p.get("categories_ids") or [])})
    names_map: Dict[int, str] = {}
    if ids:
        # /wp-json/wp/v2/categories?include=1,2,3
        include = ",".join(str(i) for i in ids)
        cat_url = f"{root}/wp-json/wp/v2/categories?include={include}&per_page={len(ids)}"
        cats = _fetch_json(cat_url)
        if isinstance(cats, list):
            for c in cats:
                cid = c.get("id")
                name = c.get("name")
                if isinstance(cid, int) and isinstance(name, str):
                    names_map[cid] = name

    # Build final objects with cleaned text
    final: List[Dict] = []
    for p in simplified:
        link = p.get("link") or ""
        title_text = clean_html(p.get("title_html") or "").strip()
        content_text = clean_html(p.get("content_html") or "").strip()
        cats = [names_map.get(cid) for cid in (p.get("categories_ids") or []) if names_map.get(cid)]
        final.append({
            "url": link,
            "title": title_text,
            "date": p.get("date") or "",
            "author": None,  # Author name requires extra call; optional
            "categories": cats,
            "content": content_text,
        })

    return final
