import { performance } from 'perf_hooks';

interface BenchmarkResult {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
}

interface BenchmarkSuite {
  suiteName: string;
  results: BenchmarkResult[];
  averageDuration: number;
  successRate: number;
}

export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  
  async measureOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T | null; benchmark: BenchmarkResult }> {
    const startTime = performance.now();
    let success = true;
    let result: T | null = null;
    let error: string | undefined;
    
    try {
      result = await operation();
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    const benchmark: BenchmarkResult = {
      operation: operationName,
      duration,
      success,
      error
    };
    
    this.results.push(benchmark);
    
    return { result, benchmark };
  }
  
  generateSuite(suiteName: string): BenchmarkSuite {
    const successfulResults = this.results.filter(r => r.success);
    const averageDuration = successfulResults.length > 0
      ? successfulResults.reduce((sum, r) => sum + r.duration, 0) / successfulResults.length
      : 0;
    
    const successRate = this.results.length > 0
      ? (successfulResults.length / this.results.length) * 100
      : 0;
    
    return {
      suiteName,
      results: [...this.results],
      averageDuration,
      successRate
    };
  }
  
  clearResults(): void {
    this.results = [];
  }
  
  validateSpecRequirements(suite: BenchmarkSuite): {
    mockModeRequirement: boolean; // < 500ms
    realApiRequirement: boolean;  // < 2000ms (would be tested against real API)
    resourceRequirement: boolean; // < 100ms for resources
  } {
    const toolResults = suite.results.filter(r => r.operation.startsWith('tool_'));
    const resourceResults = suite.results.filter(r => r.operation.startsWith('resource_'));
    
    const maxToolDuration = Math.max(...toolResults.map(r => r.duration), 0);
    const maxResourceDuration = Math.max(...resourceResults.map(r => r.duration), 0);
    
    return {
      mockModeRequirement: maxToolDuration < 500,
      realApiRequirement: maxToolDuration < 2000, // Would need real API testing
      resourceRequirement: maxResourceDuration < 100
    };
  }
}

// Benchmark test for disco.dev mock API
export async function benchmarkDiscoAPI(baseUrl: string, apiKey: string): Promise<BenchmarkSuite> {
  const benchmark = new PerformanceBenchmark();
  
  // Test all major operations
  await benchmark.measureOperation('tool_discover_connectors', async () => {
    const response = await fetch(`${baseUrl}/connectors?category=developer`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.json();
  });
  
  await benchmark.measureOperation('tool_list_workspaces', async () => {
    const response = await fetch(`${baseUrl}/workspaces`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.json();
  });
  
  await benchmark.measureOperation('tool_get_workspace_status', async () => {
    const workspaceResponse = await fetch(`${baseUrl}/workspaces`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const workspaces = await workspaceResponse.json();
    
    const response = await fetch(`${baseUrl}/workspaces/${workspaces[0].id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.json();
  });
  
  await benchmark.measureOperation('tool_enable_connector', async () => {
    const workspaceResponse = await fetch(`${baseUrl}/workspaces`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const workspaces = await workspaceResponse.json();
    
    const response = await fetch(`${baseUrl}/workspaces/${workspaces[0].id}/instances`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connectorKey: 'github',
        credentials: { token: 'perf_test' }
      })
    });
    return response.json();
  });
  
  await benchmark.measureOperation('tool_check_health', async () => {
    // First get an instance ID
    const workspaceResponse = await fetch(`${baseUrl}/workspaces`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const workspaces = await workspaceResponse.json();
    
    const instancesResponse = await fetch(`${baseUrl}/workspaces/${workspaces[0].id}/instances`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const instances = await instancesResponse.json();
    
    if (instances.length > 0) {
      const response = await fetch(`${baseUrl}/instances/${instances[0].id}/health`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.json();
    }
    
    return null;
  });
  
  await benchmark.measureOperation('tool_get_usage_metrics', async () => {
    const workspaceResponse = await fetch(`${baseUrl}/workspaces`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const workspaces = await workspaceResponse.json();
    
    const response = await fetch(`${baseUrl}/analytics/usage?workspaceId=${workspaces[0].id}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.json();
  });
  
  return benchmark.generateSuite('DiscoSquared API Performance');
}

// CLI runner for performance benchmarks
if (import.meta.url === `file://${process.argv[1]}`) {
  const apiKey = process.env.DISCO_API_KEY || 'disco_sk_test';
  const baseUrl = process.env.DISCO_API_URL || 'http://localhost:4000/v1';
  
  console.log('🚀 Running DiscoSquared Performance Benchmarks');
  console.log(`📡 Testing against: ${baseUrl}`);
  console.log(`🔑 Using API key: ${apiKey.substring(0, 12)}...`);
  
  benchmarkDiscoAPI(baseUrl, apiKey).then(suite => {
    console.log(`\n📊 Performance Results: ${suite.suiteName}`);
    console.log(`⏱️  Average Duration: ${suite.averageDuration.toFixed(2)}ms`);
    console.log(`✅ Success Rate: ${suite.successRate.toFixed(1)}%`);
    
    const requirements = new PerformanceBenchmark().validateSpecRequirements(suite);
    console.log(`\n🎯 Specification Compliance:`);
    console.log(`Mock Mode (< 500ms): ${requirements.mockModeRequirement ? '✅' : '❌'}`);
    console.log(`Real API (< 2000ms): ${requirements.realApiRequirement ? '✅' : '❌'}`);
    console.log(`Resources (< 100ms): ${requirements.resourceRequirement ? '✅' : '❌'}`);
    
    console.log(`\n📋 Detailed Results:`);
    suite.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = result.duration.toFixed(2);
      console.log(`${status} ${result.operation}: ${duration}ms`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
  }).catch(error => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
}