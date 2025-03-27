from flask import Flask, request, jsonify
from flask_cors import CORS
import time
from redis_setup import get_redis_client
from config import RATE_LIMIT, WINDOW_TIME, BUCKET_CAPACITY, BUCKET_TIME

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
redis_client = get_redis_client()

def fixed_window_rate_limit(user_id):
    """Fixed window rate limiting algorithm."""
    key = f"rate_limit:{user_id}:{int(time.time() // WINDOW_TIME)}"
    current = redis_client.incr(key)

    if current == 1:
        redis_client.expire(key, WINDOW_TIME)  # Set expiry only on first request

    return current <= RATE_LIMIT

def token_bucket_rate_limit(user_id):
    """Token bucket rate limiting algorithm."""
    # Keys for storing bucket state
    tokens_key = f"tokens:{user_id}"
    last_update_key = f"last_update:{user_id}"
    
    # Get current time
    current_time = time.time()
    
    # Get last update time and current tokens
    last_update = float(redis_client.get(last_update_key) or current_time)
    current_tokens = float(redis_client.get(tokens_key) or BUCKET_CAPACITY)
    
    # Calculate time passed and tokens to add
    time_passed = current_time - last_update
    tokens_to_add = time_passed * (BUCKET_CAPACITY / BUCKET_TIME)
    
    # Update tokens (capped at bucket capacity)
    current_tokens = min(BUCKET_CAPACITY, current_tokens + tokens_to_add)
    
    # If we have enough tokens, consume one and allow the request
    if current_tokens >= 1:
        current_tokens -= 1
        redis_client.set(tokens_key, current_tokens)
        redis_client.set(last_update_key, current_time)
        redis_client.expire(tokens_key, BUCKET_TIME)
        redis_client.expire(last_update_key, BUCKET_TIME)
        return True
    
    return False

def is_allowed(user_id, algorithm="fixed_window"):
    """Checks if a user is within the rate limit based on the selected algorithm."""
    algorithms = {
        "fixed_window": fixed_window_rate_limit,
        "token_bucket": token_bucket_rate_limit
    }
    
    if algorithm not in algorithms:
        return False
    
    return algorithms[algorithm](user_id)

@app.route("/api", methods=["GET"])
def api_endpoint():
    user_id = request.remote_addr  # Using IP as a simple identifier
    algorithm = request.args.get("algorithm", "fixed_window")

    if not is_allowed(user_id, algorithm):
        return jsonify({"error": "Too Many Requests"}), 429

    return jsonify({"message": "Request successful!"})

if __name__ == "__main__":
    app.run(debug=True)
