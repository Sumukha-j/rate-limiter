// Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Algorithm descriptions
const algorithmDescriptions = {
    fixed_window: "Fixed Window: Allows a fixed number of requests within a time window.",
    token_bucket: "Token Bucket: Maintains a bucket of tokens that refill at a constant rate. Each request consumes one token."
};

// Function to update algorithm description
function updateAlgorithmDescription() {
    const algorithm = document.getElementById('algorithmSelect').value;
    const description = algorithmDescriptions[algorithm];
    document.getElementById('algorithmDescription').textContent = description;
}

// Function to add a request to the history
function addToHistory(request, response, status) {
    const historyDiv = document.getElementById('requestHistory');
    const timestamp = new Date().toLocaleTimeString();
    const statusClass = status === 'success' ? 'status-success' : 'status-error';
    
    const requestElement = document.createElement('div');
    requestElement.className = `mb-2 ${statusClass}`;
    requestElement.innerHTML = `
        <strong>${timestamp}</strong><br>
        Request: ${request}<br>
        Response: ${response}<br>
        Status: ${status}
    `;
    
    historyDiv.insertBefore(requestElement, historyDiv.firstChild);
}

// Function to send requests to the API
async function sendRequests() {
    const requestCount = parseInt(document.getElementById('requestCount').value);
    const algorithm = document.getElementById('algorithmSelect').value;
    
    for (let i = 0; i < requestCount; i++) {
        try {
            const response = await fetch(`${API_BASE_URL}?algorithm=${algorithm}`);
            const data = await response.json();
            
            const status = response.status === 429 ? 'error' : 'success';
            addToHistory(
                `Request ${i + 1}/${requestCount} (${algorithm})`,
                JSON.stringify(data),
                status
            );
            
            // Add a small delay between requests to make them visible
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            addToHistory(
                `Request ${i + 1}/${requestCount} (${algorithm})`,
                `Error: ${error.message}`,
                'error'
            );
        }
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    updateAlgorithmDescription();
    console.log('Rate Limiter Testing Interface initialized');
});
