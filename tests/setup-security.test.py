from pathlib import Path
import importlib.util
import tempfile
import sqlite3
import os
import hashlib
import hmac
from contextlib import closing

root = Path(__file__).resolve().parents[1]
module_spec = importlib.util.spec_from_file_location('secure_setup',root / 'scripts/setup-secure-login.py')
setup_module = importlib.util.module_from_spec(module_spec)
module_spec.loader.exec_module(setup_module)
with tempfile.TemporaryDirectory(prefix='hotel-os-setup-test-') as directory:
    project = Path(directory)
    assert project.resolve().parent == Path(tempfile.gettempdir()).resolve() and project.name.startswith('hotel-os-setup-test-')
    (project / 'prisma').mkdir()
    target = project / 'prisma/dev.db'
    with closing(sqlite3.connect(target)) as db:
        db.executescript('''
        CREATE TABLE User (id TEXT PRIMARY KEY, name TEXT, status TEXT, passwordHash TEXT, pin TEXT, updatedAt DATETIME);
        CREATE TABLE Membership (id TEXT, userId TEXT, organizationId TEXT, status TEXT);
        CREATE TABLE PropertyGrant (membershipId TEXT, roleId TEXT);
        CREATE TABLE Role (id TEXT, code TEXT);
        CREATE TABLE UserSession (userId TEXT, revokedAt DATETIME);
        INSERT INTO User VALUES ('owner','Synthetic Owner','ACTIVE',NULL,NULL,NULL),('staff','Synthetic Staff','ACTIVE',NULL,'123456',NULL);
        INSERT INTO Role VALUES ('owner-role','ORG_OWNER');
        INSERT INTO Membership VALUES ('m1','owner','org1','ACTIVE');
        INSERT INTO PropertyGrant VALUES ('m1','owner-role');
        INSERT INTO UserSession VALUES ('staff',NULL);
        ''')
    (project / '.env').write_text('DATABASE_URL="file:./dev.db"',encoding='utf-8')
    old_url = os.environ.pop('DATABASE_URL',None)
    try:
        result = setup_module.setup(project,'synthetic-secure-password')
        assert result['owner_ready'] and result['legacy_credentials_migrated'] == 1 and result['backup_created']
        with closing(sqlite3.connect(target)) as db:
            for user, expected in [('owner','synthetic-secure-password'),('staff','123456')]:
                stored, pin = db.execute('SELECT passwordHash,pin FROM User WHERE id=?',(user,)).fetchone()
                salt,key = stored.split(':')
                computed = hashlib.scrypt(expected.encode(),salt=salt.encode(),n=16384,r=8,p=1,dklen=64).hex()
                assert hmac.compare_digest(key,computed) and pin is None
            assert db.execute('SELECT count(*) FROM UserSession WHERE revokedAt IS NULL').fetchone()[0] == 0
        snapshot = next((project / 'prisma/backups').glob('*.db'))
        with closing(sqlite3.connect(snapshot)) as db:
            assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
            assert db.execute("SELECT passwordHash FROM User WHERE id='owner'").fetchone()[0] is None
        try:
            setup_module.setup(project,'cannot-overwrite-existing-owner')
            raise AssertionError('Existing owner was overwritten')
        except ValueError:
            pass
    finally:
        if old_url is not None:
            os.environ['DATABASE_URL'] = old_url
print('PASS: owner setup, legacy PIN migration, consistent backup, session revocation, and overwrite protection')
