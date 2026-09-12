#!/usr/bin/env python3
"""Build and verify the exact Lambda archives used by checks and deployment."""
from argparse import ArgumentParser
from hashlib import sha256
import json
from pathlib import Path
import stat
import sys
from zipfile import ZIP_STORED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parents[1]
FIXED_TIME = (1980, 1, 1, 0, 0, 0)
MAX_SOURCE_BYTES = 2 * 1024 * 1024
ARCHIVES = {
    "contact-lambda.zip": (
        ("lambda_function.py", ROOT / "sns_publish_lambda/lambda_function.py"),
    ),
    "stats-aggregator.zip": (
        ("lambda_function.py", ROOT / "stats_aggregator/lambda_function.py"),
        ("ledger.py", ROOT / "stats_aggregator/ledger.py"),
        ("payload.py", ROOT / "stats_aggregator/payload.py"),
    ),
}


def source_bytes(filename):
    resolved = filename.resolve(strict=True)
    if resolved != filename or filename.is_symlink() or not filename.is_file():
        raise ValueError(f"Release source must be a regular in-repository file: {filename}")
    data = filename.read_bytes()
    if not data or len(data) > MAX_SOURCE_BYTES:
        raise ValueError(f"Release source is empty or exceeds {MAX_SOURCE_BYTES} bytes: {filename}")
    return data


def archive_bytes(members):
    from io import BytesIO

    output = BytesIO()
    with ZipFile(output, "w", compression=ZIP_STORED) as package:
        for member, source in members:
            info = ZipInfo(member, FIXED_TIME)
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o444) << 16
            package.writestr(info, source_bytes(source))
    return output.getvalue()


def expected_release():
    files = {}
    manifest = {"version": 1, "archives": {}}
    for name, members in ARCHIVES.items():
        data = archive_bytes(members)
        files[name] = data
        manifest["archives"][name] = {
            "bytes": len(data),
            "sha256": sha256(data).hexdigest(),
            "members": [member for member, _source in members],
            "sources": {
                member: sha256(source_bytes(source)).hexdigest()
                for member, source in members
            },
        }
    return files, json.dumps(manifest, indent=2, sort_keys=True).encode() + b"\n"


def build(output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    if output_dir.is_symlink() or not output_dir.is_dir():
        raise ValueError("Release output must be a regular directory")
    files, manifest = expected_release()
    for name, data in files.items():
        target = output_dir / name
        if target.is_symlink() or (target.exists() and not target.is_file()):
            raise ValueError(f"Release output must be a regular file: {target}")
        target.write_bytes(data)
    manifest_path = output_dir / "manifest.json"
    if manifest_path.is_symlink() or (manifest_path.exists() and not manifest_path.is_file()):
        raise ValueError(f"Release output must be a regular file: {manifest_path}")
    manifest_path.write_bytes(manifest)
    return files, manifest


def verify(output_dir):
    files, manifest = expected_release()
    expected_names = {*files, "manifest.json"}
    actual_names = {path.name for path in output_dir.iterdir()}
    if actual_names != expected_names:
        raise ValueError(f"Release artifact set differs: expected {sorted(expected_names)}")
    for name, data in {**files, "manifest.json": manifest}.items():
        path = output_dir / name
        if path.is_symlink() or path.read_bytes() != data:
            raise ValueError(f"Checked release artifact differs from source: {name}")
    return files, manifest


def main(argv=None):
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("build", "verify"))
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args(argv)
    files, _manifest = build(args.output_dir) if args.command == "build" else verify(args.output_dir)
    print("Verified release archives: " + ", ".join(
        f"{name}={len(data)}B sha256:{sha256(data).hexdigest()}" for name, data in files.items()
    ))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as error:
        print(f"Release packaging blocked: {error}", file=sys.stderr)
        raise SystemExit(1)
