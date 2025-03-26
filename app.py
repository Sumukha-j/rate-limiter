from flask import Flask, request, jsonify
import time
from redis_setup import get_redis_client

app = Flask(__name__)
redis_client = get_redis_client()

# Rate limit settings
RATE_LIMIT = 100  # Max requests per user
TIME_WINDOW = 6  # Time window in seconds (1 min)

def is_allowed(user_id):
    """Checks if a user is within the rate limit."""
    key = f"rate_limit:{user_id}:{int(time.time() // TIME_WINDOW)}"
    current = redis_client.incr(key)

    if current == 1:
        redis_client.expire(key, TIME_WINDOW)  # Set expiry only on first request

    return current <= RATE_LIMIT

@app.route("/api", methods=["GET"])
def api_endpoint():
    user_id = request.remote_addr  # Using IP as a simple identifier

    if not is_allowed(user_id):
        return jsonify({"error": "Too Many Requests"}), 429

    return jsonify({"message": "Request successful!"})

if __name__ == "__main__":
    app.run(debug=True)
