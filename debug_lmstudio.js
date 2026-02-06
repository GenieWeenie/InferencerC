const http = require('http');

async function makeRequest(path, method, payload) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 1234,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', (e) => resolve({ statusCode: 0, error: e.message }));
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log("=== Starting LM Studio Probe ===");

  // 1. Get Model ID
  const modelsRes = await makeRequest('/v1/models', 'GET', '');
  const modelsData = JSON.parse(modelsRes.data || '{}');
  const modelId = modelsData.data?.[0]?.id;
  
  if (!modelId) { console.error("No models found!"); return; }
  console.log(`Target Model: ${modelId}`);

  const tests = [
    {
      name: "Standard Chat (logprobs=true, top=5)",
      endpoint: '/v1/chat/completions',
      payload: { model: modelId, messages: [{role:"user", content:"hi"}], logprobs: true, top_logprobs: 5, max_tokens: 20 }
    },
    {
      name: "Chat (logprobs=true, top=1)",
      endpoint: '/v1/chat/completions',
      payload: { model: modelId, messages: [{role:"user", content:"hi"}], logprobs: true, top_logprobs: 1, max_tokens: 20 }
    },
    {
      name: "Chat (logprobs=true, NO top_logprobs)",
      endpoint: '/v1/chat/completions',
      payload: { model: modelId, messages: [{role:"user", content:"hi"}], logprobs: true, max_tokens: 20 }
    },
    {
      name: "Legacy Text Completion",
      endpoint: '/v1/completions',
      payload: { model: modelId, prompt: "Hi", logprobs: 1, max_tokens: 20 }
    }
  ];

  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    try {
      const res = await makeRequest(test.endpoint, 'POST', JSON.stringify(test.payload));
      if (res.statusCode !== 200) {
        console.log(`FAILED (Status ${res.statusCode})`);
        continue;
      }
      
      const json = JSON.parse(res.data);
      const choice = json.choices?.[0];
      
      if (!choice) {
        console.log("No choices returned.");
      } else if (choice.logprobs) {
        // Chat format vs Text format
        const content = choice.logprobs.content || choice.logprobs.tokens; 
        if (content) {
            console.log("SUCCESS! Logprobs received.");
            console.log("Sample:", JSON.stringify(choice.logprobs, null, 2).substring(0, 100) + "...");
        } else {
            console.log("PARTIAL: Logprobs object exists but 'content'/'tokens' is missing.");
            console.log(JSON.stringify(choice.logprobs, null, 2));
        }
      } else {
        console.log("FAILED: 'logprobs' is null.");
      }
    } catch (e) {
      console.log(`ERROR: ${e.message}`);
    }
  }
}

runTests();
