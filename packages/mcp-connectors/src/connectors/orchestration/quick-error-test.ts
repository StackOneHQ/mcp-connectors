#!/usr/bin/env tsx

import { OrchestrationConnectorConfig } from './index';

// Helper function to call tool handlers with proper context
const callTool = async (toolName: keyof typeof OrchestrationConnectorConfig.tools, args: any) => {
  const tool = OrchestrationConnectorConfig.tools[toolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found`);
  }
  return await tool.handler(args, {} as any);
};

async function testErrorHandling() {
  console.log('🧪 Testing Error Handling...');
  
  // Clear state
  await callTool('clearAllData', { confirm: true });
  
  // Create a simple proposal
  const proposalResult = await callTool('proposeAction', {
    workflow_id: 'workflow_1',
    actor_id: 'actor_1',
    tool: 'test_tool',
    params: {},
    reason: 'Test error handling',
  });
  
  const proposal = JSON.parse(proposalResult);
  console.log(`✅ Created proposal: ${proposal.data.proposal_id}`);
  
  // Try to execute without approval - should fail
  const executeResult = await callTool('executeAction', {
    proposal_id: proposal.data.proposal_id,
  });
  const executeResponse = JSON.parse(executeResult);
  if (!executeResponse.success) {
    console.log('✅ Correctly prevented execution of unapproved proposal');
    console.log(`   Error: ${executeResponse.error}`);
  } else {
    console.log('❌ Should have failed - unapproved proposal executed');
  }
  
  // Try to review non-existent proposal - should fail
  const reviewResult = await callTool('reviewAction', {
    proposal_id: 'non_existent_proposal',
    reviewer_id: 'actor_2',
    decision: 'approve',
  });
  const reviewResponse = JSON.parse(reviewResult);
  if (!reviewResponse.success) {
    console.log('✅ Correctly handled non-existent proposal');
    console.log(`   Error: ${reviewResponse.error}`);
  } else {
    console.log('❌ Should have failed - reviewed non-existent proposal');
  }
  
  console.log('🎉 Error handling test completed!');
}

testErrorHandling().catch(console.error);
