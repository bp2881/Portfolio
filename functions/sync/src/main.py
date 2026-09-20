"""Appwrite Function entrypoint. Runs on a daily CRON, writes snapshot.json to a
public-read Storage file that the site fetches."""
import json

from appwrite.client import Client
from appwrite.input_file import InputFile
from appwrite.permission import Permission
from appwrite.role import Role
from appwrite.services.storage import Storage

from snapshot import build_snapshot, load_config
import os


def _storage(context):
    client = (
        Client()
        .set_endpoint(os.environ["APPWRITE_FUNCTION_API_ENDPOINT"])
        .set_project(os.environ["APPWRITE_FUNCTION_PROJECT_ID"])
        .set_key(context.req.headers["x-appwrite-key"])
    )
    return Storage(client)


def main(context):
    cfg = load_config()
    storage = _storage(context)

    prev = None
    try:
        prev = json.loads(storage.get_file_download(cfg["bucket_id"], cfg["file_id"]))
    except Exception:  # first run, or file missing
        context.log("no previous snapshot")

    snap = build_snapshot(cfg, prev, log=context.log)
    body = json.dumps(snap, separators=(",", ":")).encode()

    try:
        storage.delete_file(cfg["bucket_id"], cfg["file_id"])
    except Exception:
        pass
    storage.create_file(
        bucket_id=cfg["bucket_id"],
        file_id=cfg["file_id"],
        file=InputFile.from_bytes(body, filename="snapshot.json", mime_type="application/json"),
        permissions=[Permission.read(Role.any())],
    )
    return context.res.json({"ok": True, "generated_at": snap["generated_at"], "sources": snap["sources"]})
