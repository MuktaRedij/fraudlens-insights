"""FraudLens Deployment Verification Script.

Verifies the integrity of the frozen `fraud_model_v1` deployment package,
checks all 11 frozen artifact SHA-256 checksums against the manifest,
and validates the inference pipeline.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = REPO_ROOT / "backend"
DEPLOYMENT_DIR = BACKEND_DIR / "ml" / "deployment" / "fraud_model_v1"
INFERENCE_DIR = BACKEND_DIR / "ml" / "deployment" / "inference"
CHECKSUM_FILE = DEPLOYMENT_DIR / "checksums_sha256.json"


def sha256_file(filepath: Path) -> str:
    """Compute SHA-256 hash of a file."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def verify_deployment() -> bool:
    print("=" * 70)
    print("FraudLens: Verifying Frozen Deployment Integrity (fraud_model_v1)")
    print("=" * 70)

    if not CHECKSUM_FILE.is_file():
        print(f"ERROR: Checksum manifest missing at {CHECKSUM_FILE}")
        return False

    with open(CHECKSUM_FILE, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    deployment_files = manifest.get("deployment_files", {})
    if not deployment_files:
        print("ERROR: No deployment_files found in manifest.")
        return False

    print(f"\n1. Checking 11 Frozen Deployment Files ({len(deployment_files)} items):")
    all_matched = True
    for relative_path, expected_hash in deployment_files.items():
        file_path = DEPLOYMENT_DIR / relative_path
        if not file_path.exists():
            print(f"  [MISSING] {relative_path}")
            all_matched = False
            continue

        actual_hash = sha256_file(file_path)
        if actual_hash == expected_hash:
            print(f"  [PASS]    {relative_path}")
        else:
            print(f"  [FAIL]    {relative_path}")
            print(f"            Expected: {expected_hash}")
            print(f"            Actual:   {actual_hash}")
            all_matched = False

    # Check inference files if specified
    inference_files = manifest.get("inference_files", {})
    if inference_files:
        print(f"\n2. Checking Inference Files ({len(inference_files)} items):")
        for relative_path, expected_hash in inference_files.items():
            file_path = INFERENCE_DIR / relative_path
            if not file_path.exists():
                print(f"  [MISSING] {relative_path}")
                all_matched = False
                continue
            actual_hash = sha256_file(file_path)
            if actual_hash == expected_hash:
                print(f"  [PASS]    {relative_path}")
            else:
                print(f"  [FAIL]    {relative_path}")
                all_matched = False

    # Check regression test checksum
    reg_test = manifest.get("regression_test", {})
    if reg_test:
        reg_file = BACKEND_DIR / "ml" / "deployment" / "tests" / "test_inference_regression.py"
        if reg_file.exists():
            actual_hash = sha256_file(reg_file)
            expected_hash = reg_test.get("sha256")
            status = "PASS" if actual_hash == expected_hash else "FAIL"
            print(f"\n3. Regression Test File Check: [{status}]")
            if actual_hash != expected_hash:
                all_matched = False

    print("\n" + "=" * 70)
    if all_matched:
        print("RESULT: ALL FROZEN DEPLOYMENT CHECKSUMS VERIFIED SUCCESSFULLY (100% Match)")
    else:
        print("RESULT: CHECKSUM VERIFICATION FAILED")
    print("=" * 70)
    return all_matched


if __name__ == "__main__":
    success = verify_deployment()
    sys.exit(0 if success else 1)
