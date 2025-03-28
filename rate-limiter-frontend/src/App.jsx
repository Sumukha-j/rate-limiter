import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

const algorithmDescriptions = {
  fixed_window: {
    name: "Fixed Window",
    description: "Allows a fixed number of requests within a time window.",
    config: {
      maxRequests: 5,
      windowTime: 60
    }
  },
  token_bucket: {
    name: "Token Bucket",
    description: "Maintains a bucket of tokens that refill at a constant rate. Each request consumes one token.",
    config: {
      capacity: 5,
      refillTime: 60
    }
  }
};

function App() {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('fixed_window');
  const [requestCount, setRequestCount] = useState(1);
  const [requestHistory, setRequestHistory] = useState([]);
  const [vizState, setVizState] = useState({
    fixedWindow: { count: 0, timeLeft: 60 },
    tokenBucket: { tokens: 5, lastUpdate: Date.now() }
  });

  // Update token bucket visualization
  useEffect(() => {
    const interval = setInterval(() => {
      setVizState(prev => {
        const now = Date.now();
        const timePassed = (now - prev.tokenBucket.lastUpdate) / 1000;
        const tokensToAdd = Math.min(
          algorithmDescriptions.token_bucket.config.capacity - prev.tokenBucket.tokens,
          (timePassed * algorithmDescriptions.token_bucket.config.capacity) / 
          algorithmDescriptions.token_bucket.config.refillTime
        );

        return {
          ...prev,
          tokenBucket: {
            tokens: Math.min(
              algorithmDescriptions.token_bucket.config.capacity,
              prev.tokenBucket.tokens + tokensToAdd
            ),
            lastUpdate: now
          }
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Update fixed window timer
  useEffect(() => {
    const interval = setInterval(() => {
      setVizState(prev => ({
        ...prev,
        fixedWindow: {
          ...prev.fixedWindow,
          timeLeft: Math.max(0, prev.fixedWindow.timeLeft - 1)
        }
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendRequests = async () => {
    for (let i = 0; i < requestCount; i++) {
      try {
        const response = await fetch(`${API_BASE_URL}?algorithm=${selectedAlgorithm}`);
        const data = await response.json();
        const success = response.status !== 429;

        // Update visualization state
        setVizState(prev => {
          if (selectedAlgorithm === 'fixed_window') {
            return {
              ...prev,
              fixedWindow: {
                count: success ? prev.fixedWindow.count + 1 : prev.fixedWindow.count,
                timeLeft: prev.fixedWindow.timeLeft
              }
            };
          } else {
            return {
              ...prev,
              tokenBucket: {
                tokens: success ? prev.tokenBucket.tokens - 1 : prev.tokenBucket.tokens,
                lastUpdate: Date.now()
              }
            };
          }
        });

        // Add to history
        setRequestHistory(prev => [{
          timestamp: new Date().toLocaleTimeString(),
          request: `Request ${i + 1}/${requestCount} (${selectedAlgorithm})`,
          response: JSON.stringify(data),
          status: success ? 'success' : 'error'
        }, ...prev]);

        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        setRequestHistory(prev => [{
          timestamp: new Date().toLocaleTimeString(),
          request: `Request ${i + 1}/${requestCount} (${selectedAlgorithm})`,
          response: `Error: ${error.message}`,
          status: 'error'
        }, ...prev]);
      }
    }
  };

  return (
    <Container className="mt-5">
      <h1 className="mb-4">Rate Limiter Testing Interface</h1>
      
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Header>
              <Card.Title className="mb-0">Rate Limiter Configuration</Card.Title>
            </Card.Header>
            <Card.Body>
              <Form.Group className="mb-3">
                <Form.Label>Rate Limiting Algorithm</Form.Label>
                <Form.Select 
                  value={selectedAlgorithm}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                >
                  {Object.entries(algorithmDescriptions).map(([key, value]) => (
                    <option key={key} value={key}>{value.name}</option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  {algorithmDescriptions[selectedAlgorithm].description}
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Number of Requests</Form.Label>
                <Form.Control
                  type="number"
                  value={requestCount}
                  onChange={(e) => setRequestCount(parseInt(e.target.value))}
                  min="1"
                  max="20"
                />
              </Form.Group>

              <Button variant="primary" onClick={sendRequests}>
                Send Requests
              </Button>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Algorithm Visualization</Card.Title>
            </Card.Header>
            <Card.Body>
              {selectedAlgorithm === 'fixed_window' ? (
                <div>
                  <h6>Fixed Window Progress</h6>
                  <div className="progress mb-2">
                    <div
                      className="progress-bar"
                      role="progressbar"
                      style={{
                        width: `${(vizState.fixedWindow.count / algorithmDescriptions.fixed_window.config.maxRequests) * 100}%`
                      }}
                    >
                      {vizState.fixedWindow.count}/{algorithmDescriptions.fixed_window.config.maxRequests} requests
                    </div>
                  </div>
                  <small className="text-muted">
                    Window resets in: {vizState.fixedWindow.timeLeft}s
                  </small>
                </div>
              ) : (
                <div>
                  <h6>Token Bucket</h6>
                  <div className="d-flex align-items-end mb-2" style={{ height: '100px' }}>
                    <div className="border border-primary rounded-bottom" style={{ width: '60px', height: '100%' }}>
                      <div
                        className="bg-primary"
                        style={{
                          width: '100%',
                          height: `${(vizState.tokenBucket.tokens / algorithmDescriptions.token_bucket.config.capacity) * 100}%`,
                          transition: 'height 0.3s'
                        }}
                      />
                    </div>
                    <div className="ms-3">
                      <div>{vizState.tokenBucket.tokens.toFixed(1)}/{algorithmDescriptions.token_bucket.config.capacity} tokens</div>
                      <small className="text-muted">Refill rate: 1 token/12s</small>
                    </div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Request History</Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="request-history">
                {requestHistory.map((request, index) => (
                  <Alert
                    key={index}
                    variant={request.status === 'success' ? 'success' : 'danger'}
                    className="mb-2"
                  >
                    <strong>{request.timestamp}</strong><br />
                    {request.request}<br />
                    {request.response}
                  </Alert>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default App; 