import redis

def get_redis_client():
    return redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

# Test the connection
if __name__ == "__main__":
    client = get_redis_client()
    try:
        client.ping()
        print("✅ Connected to Redis!")
    except redis.ConnectionError:
        print("❌ Redis connection failed! Check Docker.")
