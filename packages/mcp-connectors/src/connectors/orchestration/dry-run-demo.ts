#!/usr/bin/env tsx

/**
 * Dry-Run Demo for Orchestration Connector
 * 
 * This script demonstrates how to use the orchestration connector
 * with dry-run mode enabled for safe testing and development.
 */

import { orchestrationState } from './state';
import { forwardToRemote, executeWithRetry } from './execute';

async function runDryRunDemo() {
  console.log('🚀 Starting Orchestration Connector Dry-Run Demo...\n');

  // Step 1: Enable dry-run mode
  console.log('📋 Step 1: Enabling dry-run mode...');
  const policy = orchestrationState.updatePolicy({
    dry_run: true,
    max_retries: 3,
    timeout_ms: 5000,
  });
  console.log('✅ Dry-run mode enabled:', policy);
  console.log('');

  // Step 2: Create actors with capabilities
  console.log('👥 Step 2: Creating actors with capabilities...');
  
  const developer = orchestrationState.createActor({
    name: 'John Developer',
    role: 'Software Engineer',
    capabilities: ['code_review', 'testing', 'deployment'],
  });
  
  const reviewer = orchestrationState.createActor({
    name: 'Sarah Reviewer',
    role: 'Senior Engineer',
    capabilities: ['code_review', 'architecture_review', 'security_review'],
  });
  
  const manager = orchestrationState.createActor({
    name: 'Mike Manager',
    role: 'Engineering Manager',
    capabilities: ['approval', 'resource_allocation', 'project_management'],
  });

  console.log('✅ Actors created:');
  console.log(`   - ${developer.name} (${developer.role}) - Capabilities: ${developer.capabilities.join(', ')}`);
  console.log(`   - ${reviewer.name} (${reviewer.role}) - Capabilities: ${reviewer.capabilities.join(', ')}`);
  console.log(`   - ${manager.name} (${manager.role}) - Capabilities: ${manager.capabilities.join(', ')}`);
  console.log('');

  // Step 3: Create a comprehensive workflow
  console.log('🔄 Step 3: Creating a code review workflow...');
  
  const workflow = orchestrationState.createWorkflow({
    name: 'Code Review Process',
    description: 'Standard code review workflow with multiple approval stages',
    priority: 'high',
    steps: [
      {
        name: 'Initial Code Review',
        description: 'Code quality and best practices review',
        actorId: reviewer.id,
        dependencies: [],
        estimatedDuration: 2, // hours
      },
      {
        name: 'Security Review',
        description: 'Security vulnerability assessment',
        actorId: reviewer.id,
        dependencies: ['step_0'], // depends on initial review
        estimatedDuration: 1,
      },
      {
        name: 'Manager Approval',
        description: 'Final approval for deployment',
        actorId: manager.id,
        dependencies: ['step_0', 'step_1'], // depends on both reviews
        estimatedDuration: 0.5,
      },
    ],
    assignedActors: [reviewer.id, manager.id],
  });

  console.log('✅ Workflow created:');
  console.log(`   - Name: ${workflow.name}`);
  console.log(`   - Priority: ${workflow.priority}`);
  console.log(`   - Status: ${workflow.status}`);
  console.log(`   - Steps: ${workflow.steps.length}`);
  console.log(`   - Assigned Actors: ${workflow.assignedActors.length}`);
  console.log('');

  // Step 4: Create a proposal for review
  console.log('📝 Step 4: Creating a proposal for review...');
  
  const proposal = orchestrationState.createProposal({
    title: 'API Documentation Update',
    description: 'Update API documentation for v2.0 with new endpoints and examples',
    priority: 'medium',
    assignedReviewers: [reviewer.id, manager.id],
  });

  console.log('✅ Proposal created:');
  console.log(`   - Title: ${proposal.title}`);
  console.log(`   - Priority: ${proposal.priority}`);
  console.log(`   - Status: ${proposal.status}`);
  console.log(`   - Reviewers: ${proposal.assignedReviewers.length}`);
  console.log('');

  // Step 5: Update workflow status to active
  console.log('🔄 Step 5: Activating the workflow...');
  
  const updatedWorkflow = orchestrationState.updateWorkflow({
    id: workflow.id,
    status: 'active',
  });

  console.log('✅ Workflow activated:', updatedWorkflow?.status);
  console.log('');

  // Step 6: Add review comments to proposal
  console.log('💬 Step 6: Adding review comments...');
  
  const updatedProposal = orchestrationState.updateProposal({
    id: proposal.id,
    status: 'under_review',
    reviewComments: [
      {
        reviewer: reviewer.id,
        comment: 'The documentation looks comprehensive. Please add more examples for error handling.',
      },
      {
        reviewer: manager.id,
        comment: 'Approved with minor suggestions. Good work on the API documentation.',
      },
    ],
  });

  console.log('✅ Review comments added:');
  console.log(`   - Status: ${updatedProposal?.status}`);
  console.log(`   - Comments: ${updatedProposal?.reviewComments.length}`);
  console.log('');

  // Step 7: Test remote execution with dry-run
  console.log('🌐 Step 7: Testing remote execution with dry-run...');
  
  const remoteResult = await forwardToRemote('test_tool', {
    param1: 'value1',
    param2: 'value2',
  });

  console.log('✅ Remote execution result (dry-run):');
  console.log(`   - Success: ${remoteResult.success}`);
  console.log(`   - Simulated: ${remoteResult.simulated}`);
  console.log(`   - Data: ${JSON.stringify(remoteResult.data)}`);
  console.log('');

  // Step 8: Test retry logic with dry-run
  console.log('🔄 Step 8: Testing retry logic with dry-run...');
  
  const retryResult = await executeWithRetry('test_tool_with_retry', {
    retry_param: 'test_value',
  });

  console.log('✅ Retry execution result (dry-run):');
  console.log(`   - Success: ${retryResult.success}`);
  console.log(`   - Simulated: ${retryResult.simulated}`);
  console.log(`   - Data: ${JSON.stringify(retryResult.data)}`);
  console.log('');

  // Step 9: Query actors by capabilities
  console.log('🔍 Step 9: Querying actors by capabilities...');
  
  const codeReviewers = orchestrationState.queryActors({
    capabilities: ['code_review'],
  });

  console.log('✅ Code reviewers found:', codeReviewers.length);
  codeReviewers.forEach(actor => {
    console.log(`   - ${actor.name} (${actor.role})`);
  });
  console.log('');

  // Step 10: Query workflows by status
  console.log('🔍 Step 10: Querying workflows by status...');
  
  const activeWorkflows = orchestrationState.queryWorkflows({
    status: 'active',
  });

  console.log('✅ Active workflows found:', activeWorkflows.length);
  activeWorkflows.forEach(wf => {
    console.log(`   - ${wf.name} (${wf.priority} priority)`);
  });
  console.log('');

  // Step 11: Query proposals by status
  console.log('🔍 Step 11: Querying proposals by status...');
  
  const underReviewProposals = orchestrationState.queryProposals({
    status: 'under_review',
  });

  console.log('✅ Proposals under review:', underReviewProposals.length);
  underReviewProposals.forEach(prop => {
    console.log(`   - ${prop.title} (${prop.priority} priority)`);
  });
  console.log('');

  // Step 12: Query audit events
  console.log('📊 Step 12: Querying audit events...');
  
  const auditEvents = orchestrationState.queryAuditEvents({
    entityType: 'proposal',
  });

  console.log('✅ Audit events for proposals:', auditEvents.length);
  auditEvents.slice(0, 3).forEach(event => {
    console.log(`   - ${event.eventType} for ${event.entityType} ${event.entityId}`);
  });
  console.log('');

  // Step 13: Get comprehensive statistics
  console.log('📈 Step 13: Getting system statistics...');
  
  const stats = orchestrationState.getStats();

  console.log('✅ System Statistics:');
  console.log(`   - Actors: ${stats.actors.total} total (${stats.actors.active} active, ${stats.actors.inactive} inactive, ${stats.actors.busy} busy)`);
  console.log(`   - Workflows: ${stats.workflows.total} total (${stats.workflows.draft} draft, ${stats.workflows.active} active, ${stats.workflows.completed} completed)`);
  console.log(`   - Proposals: ${stats.proposals.total} total (${stats.proposals.draft} draft, ${stats.proposals.submitted} submitted, ${stats.proposals.under_review} under review)`);
  console.log(`   - Audit Events: ${stats.audit.total_events} total`);
  console.log(`   - Policy: dry_run=${stats.policy.dry_run}, max_retries=${stats.policy.max_retries}, timeout_ms=${stats.policy.timeout_ms}`);
  console.log('');

  // Step 14: Test policy updates
  console.log('⚙️ Step 14: Testing policy updates...');
  
  const updatedPolicy = orchestrationState.updatePolicy({
    max_retries: 5,
    timeout_ms: 15000,
  });

  console.log('✅ Policy updated:');
  console.log(`   - Dry-run: ${updatedPolicy.dry_run}`);
  console.log(`   - Max retries: ${updatedPolicy.max_retries}`);
  console.log(`   - Timeout: ${updatedPolicy.timeout_ms}ms`);
  console.log('');

  // Step 15: Demonstrate actor updates
  console.log('👤 Step 15: Updating actor status...');
  
  const updatedActor = orchestrationState.updateActor({
    id: developer.id,
    status: 'busy',
    capabilities: ['code_review', 'testing', 'deployment', 'documentation'],
  });

  console.log('✅ Actor updated:');
  console.log(`   - Name: ${updatedActor?.name}`);
  console.log(`   - Status: ${updatedActor?.status}`);
  console.log(`   - Capabilities: ${updatedActor?.capabilities.join(', ')}`);
  console.log('');

  // Step 16: Final statistics
  console.log('📊 Step 16: Final system statistics...');
  
  const finalStats = orchestrationState.getStats();

  console.log('✅ Final Statistics:');
  console.log(`   - Actors: ${finalStats.actors.total} total (${finalStats.actors.active} active, ${finalStats.actors.inactive} inactive, ${finalStats.actors.busy} busy)`);
  console.log(`   - Workflows: ${finalStats.workflows.total} total (${finalStats.workflows.draft} draft, ${finalStats.workflows.active} active, ${finalStats.workflows.completed} completed)`);
  console.log(`   - Proposals: ${finalStats.proposals.total} total (${finalStats.proposals.draft} draft, ${finalStats.proposals.submitted} submitted, ${finalStats.proposals.under_review} under review)`);
  console.log(`   - Audit Events: ${finalStats.audit.total_events} total`);
  console.log('');

  console.log('🎉 Dry-run demo completed successfully!');
  console.log('💡 All operations were simulated due to dry-run mode being enabled.');
  console.log('🔧 To disable dry-run mode, call: orchestrationState.updatePolicy({ dry_run: false })');
  console.log('🧹 To clear all data, call: orchestrationState.clearAll()');
}

// Run the demo
runDryRunDemo().catch(console.error);


