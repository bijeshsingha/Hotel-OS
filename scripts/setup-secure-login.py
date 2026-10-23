"""Provision the existing owner locally; never print or write plaintext credentials."""
import argparse
from contextlib import closing
import getpass
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
from datetime import datetime, timezone

HASH_PATTERN = re.compile(r'^[a-fA-F0-9]{32}:[a-fA-F0-9]{128}$')

def hash_password(value):
    salt = os.urandom(16).hex()
    key = hashlib.scrypt(value.strip().encode('utf-8'), salt=salt.encode('ascii'), n=16384, r=8, p=1, dklen=64)
    return salt + ':' + key.hex()

def configured_database(project):
    database_url = os.environ.get('DATABASE_URL', '')
    if not database_url:
        env_path = project / '.env'
        if env_path.exists():
            for line in env_path.read_text(encoding='utf-8-sig').splitlines():
                if line.startswith('DATABASE_URL='):
                    database_url = line.split('=',1)[1].strip().strip('\"\'')
                    break
    if not database_url.startswith('file:'):
        raise ValueError('A configured local SQLite database is required; no database will be created.')
    raw = database_url[5:].split('?',1)[0]
    target = Path(raw)
    if not target.is_absolute():
        target = project / 'prisma' / target
    target = target.resolve()
    if not target.is_file():
        raise ValueError('The configured database does not exist; setup stopped.')
    return target

def setup(project, password, result_path=None):
    if len(password.strip()) < 12 or len(password) > 1024:
        raise ValueError('Choose a password of at least 12 characters.')
    target = configured_database(project)
    db = sqlite3.connect(target.as_uri() + '?mode=rw', uri=True, timeout=30)
    try:
        owners = db.execute("SELECT DISTINCT u.id, u.passwordHash, u.pin FROM User u JOIN Membership m ON m.userId=u.id JOIN PropertyGrant g ON g.membershipId=m.id JOIN Role r ON r.id=g.roleId WHERE r.code='ORG_OWNER' AND u.status='ACTIVE' AND m.status='ACTIVE'").fetchall()
        if len(owners) != 1:
            raise ValueError('Setup requires exactly one existing active owner; use an administrator-approved reset for other cases.')
        owner_id, owner_hash, owner_pin = owners[0]
        if owner_hash or owner_pin:
            raise ValueError('The owner already has an individual credential; this first-time setup will not overwrite it.')
        backup_dir = project / 'prisma' / 'backups'
        backup_dir.mkdir(parents=True, exist_ok=True)
        backup_name = 'pre_secure_login_' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ') + '.db'
        with closing(sqlite3.connect(backup_dir / backup_name)) as backup:
            db.backup(backup)
        # Existing PIN-only users keep the same login secret, now stored as a hash.
        with db:
            changed_at = int(datetime.now(timezone.utc).timestamp() * 1000)
            new_owner_hash = hash_password(password)
            updated = db.execute("UPDATE User SET passwordHash=?, pin=NULL, updatedAt=? WHERE id=? AND status='ACTIVE' AND (passwordHash IS NULL OR passwordHash='') AND (pin IS NULL OR pin='')", (new_owner_hash,changed_at,owner_id))
            actual_owner_hash = db.execute('SELECT passwordHash FROM User WHERE id=?',(owner_id,)).fetchone()[0]
            if updated.rowcount != 1 or not hmac.compare_digest(actual_owner_hash or '',new_owner_hash):
                raise ValueError('Owner credentials changed during setup; no migration was applied.')
            migrated = 0
            for user_id, stored_hash, stored_pin in db.execute('SELECT id, passwordHash, pin FROM User').fetchall():
                new_hash = stored_hash
                new_pin = stored_pin
                if stored_hash and not HASH_PATTERN.fullmatch(stored_hash):
                    new_hash = hash_password(stored_hash)
                if stored_pin and not HASH_PATTERN.fullmatch(stored_pin):
                    if not new_hash:
                        new_hash = hash_password(stored_pin)
                        new_pin = None
                    else:
                        new_pin = hash_password(stored_pin)
                if (new_hash,new_pin) != (stored_hash,stored_pin):
                    db.execute('UPDATE User SET passwordHash=?,pin=?,updatedAt=? WHERE id=?',(new_hash,new_pin,changed_at,user_id))
                    migrated += 1
            db.execute('UPDATE UserSession SET revokedAt=? WHERE revokedAt IS NULL',(changed_at,))
        result = {'owner_ready':True,'legacy_credentials_migrated':migrated,'backup_created':True,'accounts_needing_password':db.execute("SELECT count(*) FROM User WHERE status='ACTIVE' AND (passwordHash IS NULL OR passwordHash='') AND (pin IS NULL OR pin='')").fetchone()[0]}
        if result_path:
            Path(result_path).write_text(json.dumps(result),encoding='utf-8')
        return result
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--project',type=Path,default=Path(__file__).resolve().parents[1])
    parser.add_argument('--stdin',action='store_true')
    parser.add_argument('--result')
    args = parser.parse_args()
    try:
        if args.stdin:
            supplied = json.load(sys.stdin)
            password = supplied['password']
        else:
            password = getpass.getpass('Choose your Hotel OS owner password (12+ characters): ')
            if password != getpass.getpass('Confirm your password: '):
                raise ValueError('Passwords do not match.')
        result = setup(args.project.resolve(),password,args.result)
        print(json.dumps(result))
    except Exception as error:
        # Exceptions contain status and file errors, never the submitted password.
        print(str(error),file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
