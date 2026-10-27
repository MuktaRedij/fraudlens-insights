"""Script to audit direct URL navigation and SPA fallback across all frontend routes."""

import urllib.request
import sys

ROUTES = [
    "/",
    "/dashboard",
    "/analyze",
    "/transactions",
    "/transactions/DEMO-TX-104921",
    "/alerts",
    "/models",
    "/explainability",
    "/drift",
    "/research",
    "/settings",
]

def main():
    base_url = "http://localhost:4173"
    print(f"Testing direct navigation on Vite Preview server ({base_url}):\n")
    all_passed = True
    for route in ROUTES:
        url = f"{base_url}{route}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FraudLensAudit/1.0"})
            with urllib.request.urlopen(req) as resp:
                body = resp.read().decode("utf-8")
                status = resp.status
                has_root = 'id="root"' in body
                has_assets = 'src="/assets/' in body
                print(f"  [PASS] {route:30} -> HTTP {status} | {len(body):5} bytes | Root div: {has_root} | Assets loaded: {has_assets}")
                if status != 200 or not has_root:
                    all_passed = False
        except Exception as exc:
            print(f"  [FAIL] {route:30} -> ERROR: {exc}")
            all_passed = False

    print("\nResult: " + ("ALL ROUTES PASSED" if all_passed else "SOME ROUTES FAILED"))
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
