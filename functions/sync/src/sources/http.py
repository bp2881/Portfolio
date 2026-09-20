"""Small stdlib HTTP helper so the function needs no extra dependencies."""
import json
import urllib.error
import urllib.request

# A real browser signature. Several sites answer scripted clients with 403.
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")


def request(url, *, method="GET", headers=None, data=None, timeout=25):
    h = {"User-Agent": UA, "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9"}
    h.update(headers or {})
    body = None
    if data is not None:
        body = data if isinstance(data, bytes) else json.dumps(data).encode()
        h.setdefault("Content-Type", "application/json")
    req = urllib.request.Request(url, data=body, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:  # keep the reason: it is the first thing you need when debugging
        snippet = e.read().decode("utf-8", "replace")[:200].replace("\n", " ")
        raise RuntimeError(f"HTTP {e.code} from {url}: {snippet}") from None


def get_json(url, **kw):
    return json.loads(request(url, **kw))


def post_json(url, payload, **kw):
    return json.loads(request(url, method="POST", data=payload, **kw))
