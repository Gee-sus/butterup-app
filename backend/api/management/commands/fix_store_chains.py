from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Store

VALID_CHAINS = {"paknsave", "countdown", "new_world"}

def normalize_chain(value: str | None) -> str:
    v = (value or "").strip().lower()
    return v if v in VALID_CHAINS else ""

def needs_normalization(value: str | None) -> bool:
    """Check if a chain value needs normalization (not already in lowercase canonical form)"""
    normalized = normalize_chain(value)
    return normalized != "" and (value or "").strip() != normalized

def guess_chain_from_name(name: str | None) -> str | None:
    n = (name or "").lower()
    if ("pak" in n and "save" in n) or "pak'nsave" in n or "pak n save" in n:
        return "paknsave"
    if "countdown" in n or "woolworths" in n:  # Woolworths (NZ) maps to Woolworths
        return "countdown"
    if "new world" in n or "newworld" in n:
        return "new_world"
    return None

class Command(BaseCommand):
    help = "Fix missing or incorrect chain names in store records"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be changed without making changes",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Apply fixes without interactive prompts and use bulk_update",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        force: bool = options["force"]

        self.stdout.write("🔧 Scanning stores for missing/invalid chain values...")
        stores = list(Store.objects.all())

        scanned = len(stores)
        invalid = 0
        updated = 0
        skipped = 0
        unresolved = 0
        to_update = []

        def is_invalid(chain_val: str | None) -> bool:
            return normalize_chain(chain_val) == ""

        for s in stores:
            if is_invalid(s.chain) or needs_normalization(s.chain):
                invalid += 1
                current = (s.chain or "").strip()
                suggested = guess_chain_from_name(s.name)
                self.stdout.write(f"\n📍 Store: {s.name}")
                self.stdout.write(f"   Current chain: '{current or ''}'")
                self.stdout.write(f"   Suggested chain: '{suggested or ''}'")

                if dry_run:
                    self.stdout.write("   [DRY RUN] No changes made.")
                    continue

                if not suggested:
                    # Try using the current normalized value if it's valid
                    normalized_current = normalize_chain(s.chain)
                    if normalized_current:
                        suggested = normalized_current
                    else:
                        self.stdout.write("   ⚠️  Could not infer a chain. Manual fix required.")
                        unresolved += 1
                        continue

                new_val = suggested.strip().lower()

                if force:
                    s.chain = new_val
                    to_update.append(s)
                else:
                    resp = input(
                        f"   Update '{s.name}' to chain '{new_val}'? (y/n/s=skip): "
                    ).strip().lower()
                    if resp in ("y", "yes"):
                        s.chain = new_val
                        s.save(update_fields=["chain"])
                        updated += 1
                        self.stdout.write(self.style.SUCCESS("   ✅ Updated"))
                    else:
                        skipped += 1
                        self.stdout.write("   ⏭️  Skipped")

        if not dry_run and force and to_update:
            with transaction.atomic():
                Store.objects.bulk_update(to_update, ["chain"])
            updated += len(to_update)
            self.stdout.write(
                self.style.SUCCESS(f"\n⚡ Bulk-updated {len(to_update)} store(s).")
            )

        self.stdout.write("\n===== SUMMARY =====")
        self.stdout.write(f"Scanned:    {scanned}")
        self.stdout.write(f"Invalid:    {invalid}")
        self.stdout.write(f"Updated:    {updated}")
        self.stdout.write(f"Skipped:    {skipped}")
        self.stdout.write(f"Unresolved: {unresolved}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN complete. No changes saved."))
        elif invalid == 0:
            self.stdout.write(self.style.SUCCESS("\n✅ All stores already have valid chains."))
        else:
            self.stdout.write(self.style.SUCCESS("\n🏁 Done."))
