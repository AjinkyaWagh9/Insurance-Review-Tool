"""Utility to load the Bajaj Capital logo as a base64 data URI for embedding in HTML reports."""
import base64
import os

_LOGO_PATH = os.path.join(os.path.dirname(__file__), "bajaj_logo.png")
_LOGO_B64_CACHE: str | None = None


def get_logo_data_uri() -> str:
    """Return a base64 data URI for the Bajaj Capital logo PNG."""
    global _LOGO_B64_CACHE
    if _LOGO_B64_CACHE is None:
        try:
            with open(_LOGO_PATH, "rb") as f:
                raw = base64.b64encode(f.read()).decode("ascii")
            _LOGO_B64_CACHE = f"data:image/png;base64,{raw}"
        except FileNotFoundError:
            # Graceful fallback — return empty string so <img src=""> is a broken image, not an error
            _LOGO_B64_CACHE = ""
    return _LOGO_B64_CACHE


def logo_img_tag(width: int = 160) -> str:
    """Return a complete <img> HTML tag for the Bajaj Capital logo."""
    uri = get_logo_data_uri()
    if not uri:
        return ""
    return (
        f'<img src="{uri}" '
        f'style="width:{width}px; margin-bottom:6px;" '
        f'alt="Bajaj Capital">'
    )
