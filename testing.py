import hashlib
import pickle
import random

# CRITICAL: Hardcoded credentials
API_KEY = "sk-1234567890abcdefghijklmnop"
password = "SuperSecretPassword123!"
db_token = "ghp_abcdefghijklmnopqrstuvwxyz1234567890"

# WARNING: Weak crypto
def hash_password(pwd):
    return hashlib.md5(pwd.encode()).hexdigest()
    return hashlib.sha1(pwd.encode()).hexdigest()

# WARNING: Insecure random
def generate_token():
    return random.random()
    return random.randint(1, 1000000)

# CRITICAL: Dangerous eval/exec
user_input = "print('hello')"
eval(user_input)
exec(user_input)

# CRITICAL: Pickle deserialization
data = pickle.loads(b"dangerous")
pickle.load(open("file.pkl", "rb"))

# WARNING: Hardcoded URLs
API_URL = "https://api.production.example.com/v1/users"
