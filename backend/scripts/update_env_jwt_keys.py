"""Update .env with freshly generated JWT PEM material."""
from __future__ import annotations

import pathlib
import re
import sys


def upsert(text: str, key: str, value: str) -> str:
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    replacement = f"{key}=\"{value}\""
    if pattern.search(text):
        return pattern.sub(replacement, text)
    if text and not text.endswith("\n"):
        text += "\n"
    return text + replacement + "\n"


def main(env_path: pathlib.Path, private_path: pathlib.Path, public_path: pathlib.Path) -> None:
    private_key = private_path.read_text().strip().replace("\n", "\\n")
    public_key = public_path.read_text().strip().replace("\n", "\\n")

    text = env_path.read_text()
    text = upsert(text, "JWT_PRIVATE_KEY", private_key)
    text = upsert(text, "JWT_PUBLIC_KEY", public_key)
    env_path.write_text(text)


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python update_env_jwt_keys.py <env_path> <private_pem> <public_pem>", file=sys.stderr)
        sys.exit(1)

    env_arg = pathlib.Path(sys.argv[1])
    private_arg = pathlib.Path(sys.argv[2])
    public_arg = pathlib.Path(sys.argv[3])

    main(env_arg, private_arg, public_arg)
