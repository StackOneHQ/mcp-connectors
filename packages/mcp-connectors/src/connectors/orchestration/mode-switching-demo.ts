#!/usr/bin/env tsx

/**
 * Mode Switching Demo for Orchestration Connector
 * 
 * This script demonstrates how to switch between dry-run and normal modes
 * for testing and production use.
 */

import { orchestrationState } from './state';
import { forwardToRemote } from './execute';

async function runModeSwitchingDemo() {
  console.log('🔄 Starting Mode Switching Demo...\n');

  // Initial state
  console.log('📋 Initial Policy State:');
  const initialPolicy = orchestrationState.getPolicy();
  console.log('   - Dry-run:', initialPolicy.dry_run);
  console.log('   - Max retries:', initialPolicy.max_retries);
  console.log('   - Timeout:', initialPolicy.timeout_ms, 'ms');
  console.log('');

  // Test 1: Dry-run mode (safe testing)
  console.log('🧪 Test 1: Dry-run mode (safe testing)...');
  
  orchestrationState.updatePolicy({ dry_run: true });
  
  const dryRunResult = await forwardToRemote('test_tool', { param: 'test_value' });
  console.log('   - Remote call result:', dryRunResult.success ? '✅ Success (simulated)' : '❌ Failed');
  console.log('   - Simulated:', dryRunResult.simulated);
  console.log('   - Data:', JSON.stringify(dryRunResult.data));
  console.log('');

  // Test 2: Normal mode (real execution)
  console.log('🚀 Test 2: Normal mode (real execution)...');
  
  orchestrationState.updatePolicy({ dry_run: false });
  
  try {
    const normalResult = await forwardToRemote('test_tool', { param: 'test_value' });
    console.log('   - Remote call result:', normalResult.success ? '✅ Success' : '❌ Failed');
    console.log('   - Simulated:', normalResult.simulated);
    console.log('   - Data:', JSON.stringify(normalResult.data));
  } catch (error) {
    console.log('   - Remote call failed (expected):', error instanceof Error ? error.message : 'Unknown error');
    console.log('   - This is expected since no real server is running');
  }
  console.log('');

  // Test 3: Policy configuration changes
  console.log('⚙️ Test 3: Policy configuration changes...');
  
  const updatedPolicy = orchestrationState.updatePolicy({
    dry_run: true,
    max_retries: 5,
    timeout_ms: 10000,
  });
  
  console.log('   - Updated policy:');
  console.log('     * Dry-run:', updatedPolicy.dry_run);
  console.log('     * Max retries:', updatedPolicy.max_retries);
  console.log('     * Timeout:', updatedPolicy.timeout_ms, 'ms');
  console.log('');

  // Test 4: Create and manage entities in dry-run mode
  console.log('👥 Test 4: Creating entities in dry-run mode...');
  
  const actor = orchestrationState.createActor({
    name: 'Test Actor',
    role: 'Test Role',
    capabilities: ['test_capability'],
  });
  
  const workflow = orchestrationState.createWorkflow({
    name: 'Test Workflow',
    description: 'Test workflow description',
    priority: 'medium',
    steps: [],
    assignedActors: [],
  });
  
  const proposal = orchestrationState.createProposal({
    title: 'Test Proposal',
    description: 'Test proposal description',
    priority: 'low',
    assignedReviewers: [],
  });
  
  console.log('   - Created entities:');
  console.log('     * Actor:', actor.name, `(${actor.id})`);
  console.log('     * Workflow:', workflow.name, `(${workflow.id})`);
  console.log('     * Proposal:', proposal.title, `(${proposal.id})`);
  console.log('');

  // Test 5: Query and statistics in dry-run mode
  console.log('📊 Test 5: Querying and statistics in dry-run mode...');
  
  const actors = orchestrationState.queryActors({});
  const workflows = orchestrationState.queryWorkflows({});
  const proposals = orchestrationState.queryProposals({});
  const stats = orchestrationState.getStats();
  
  console.log('   - Query results:');
  console.log('     * Actors:', actors.length);
  console.log('     * Workflows:', workflows.length);
  console.log('     * Proposals:', proposals.length);
  console.log('     * Total audit events:', stats.audit.total_events);
  console.log('');

  // Test 6: Switch back to normal mode and show difference
  console.log('🔄 Test 6: Switching back to normal mode...');
  
  orchestrationState.updatePolicy({ dry_run: false });
  const finalPolicy = orchestrationState.getPolicy();
  
  console.log('   - Final policy state:');
  console.log('     * Dry-run:', finalPolicy.dry_run);
  console.log('     * Max retries:', finalPolicy.max_retries);
  console.log('     * Timeout:', finalPolicy.timeout_ms, 'ms');
  console.log('');

  // Test 7: Demonstrate data persistence across mode switches
  console.log('💾 Test 7: Data persistence across mode switches...');
  
  const persistentActors = orchestrationState.queryActors({});
  const persistentWorkflows = orchestrationState.queryWorkflows({});
  const persistentProposals = orchestrationState.queryProposals({});
  
  console.log('   - Data persists across mode switches:');
  console.log('     * Actors:', persistentActors.length, '(unchanged)');
  console.log('     * Workflows:', persistentWorkflows.length, '(unchanged)');
  console.log('     * Proposals:', persistentProposals.length, '(unchanged)');
  console.log('');

  // Test 8: Clear data and reset
  console.log('🧹 Test 8: Clearing data and resetting...');
  
  orchestrationState.clearAll();
  const clearedStats = orchestrationState.getStats();
  
  console.log('   - After clearing:');
  console.log('     * Actors:', clearedStats.actors.total);
  console.log('     * Workflows:', clearedStats.workflows.total);
  console.log('     * Proposals:', clearedStats.proposals.total);
  console.log('     * Audit events:', clearedStats.audit.total_events);
  console.log('');

  console.log('✅ Mode switching demo completed!');
  console.log('');
  console.log('📝 Summary:');
  console.log('   - Dry-run mode: Safe for testing, simulates remote calls');
  console.log('   - Normal mode: Real execution, requires actual servers');
  console.log('   - Data persists across mode switches');
  console.log('   - Policy can be updated at any time');
  console.log('   - Use clearAll() to reset state');
}

// Run the demo
runModeSwitchingDemo().catch(console.error);


