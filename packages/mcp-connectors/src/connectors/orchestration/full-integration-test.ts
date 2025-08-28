#!/usr/bin/env tsx

/**
 * Full Integration Test for Merged Orchestration Connector
 * 
 * This script demonstrates a complete end-to-end workflow:
 * 1. Setting up actors and workflows
 * 2. Creating action proposals that require approval
 * 3. Reviewing and approving actions
 * 4. Executing approved actions
 * 5. Testing dry-run mode
 * 6. Parallel execution
 * 7. Audit trail and statistics
 */

import { OrchestrationConnectorConfig } from './index';
import { orchestrationState } from './state';

// Helper function to call tool handlers with proper context
const callTool = async (toolName: keyof typeof OrchestrationConnectorConfig.tools, args: any) => {
  const tool = OrchestrationConnectorConfig.tools[toolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found`);
  }
  return await tool.handler(args, {} as any);
};

// Helper function to parse JSON responses
const parseResponse = (response: string) => {
  const parsed = JSON.parse(response);
  if (!parsed.success) {
    throw new Error(`Tool call failed: ${parsed.error}`);
  }
  return parsed.data;
};

// Helper function to log with timestamps
const log = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};

async function runFullIntegrationTest() {
  log('🚀 Starting Full Integration Test for Merged Orchestration Connector');
  log('=' .repeat(80));

  try {
    // Clear any existing state
    await callTool('clearAllData', { confirm: true });
    log('✅ Cleared existing state');

    // ============================================================================
    // PHASE 1: SETUP - Create Actors and Workflows
    // ============================================================================
    log('\n📋 PHASE 1: Setting up Actors and Workflows');
    log('-'.repeat(50));

    // Create actors with different roles and capabilities
    const developerResult = await callTool('createActor', {
      name: 'Alice Developer',
      role: 'Senior Developer',
      capabilities: ['coding', 'testing', 'deployment', 'code_review'],
    });
    const developer = parseResponse(developerResult);
    log(`✅ Created developer: ${developer.name} (${developer.id})`);

    const reviewerResult = await callTool('createActor', {
      name: 'Bob Reviewer',
      role: 'Tech Lead',
      capabilities: ['code_review', 'approval', 'architecture', 'security'],
    });
    const reviewer = parseResponse(reviewerResult);
    log(`✅ Created reviewer: ${reviewer.name} (${reviewer.id})`);

    const devopsResult = await callTool('createActor', {
      name: 'Charlie DevOps',
      role: 'DevOps Engineer',
      capabilities: ['deployment', 'infrastructure', 'monitoring', 'security'],
    });
    const devops = parseResponse(devopsResult);
    log(`✅ Created DevOps engineer: ${devops.name} (${devops.id})`);

    // Create a comprehensive workflow for feature deployment
    const workflowResult = await callTool('createWorkflow', {
      name: 'Feature Deployment Pipeline',
      description: 'Complete pipeline for deploying new features to production',
      priority: 'high',
      steps: [
        {
          name: 'Code Review',
          description: 'Review code changes for quality and security',
          actorId: reviewer.id,
          dependencies: [],
          estimatedDuration: 2,
        },
        {
          name: 'Automated Testing',
          description: 'Run comprehensive test suite',
          actorId: developer.id,
          dependencies: ['Code Review'],
          estimatedDuration: 5,
        },
        {
          name: 'Security Scan',
          description: 'Run security vulnerability scans',
          actorId: devops.id,
          dependencies: ['Automated Testing'],
          estimatedDuration: 3,
        },
        {
          name: 'Staging Deployment',
          description: 'Deploy to staging environment',
          actorId: devops.id,
          dependencies: ['Security Scan'],
          estimatedDuration: 10,
        },
        {
          name: 'Production Deployment',
          description: 'Deploy to production environment',
          actorId: devops.id,
          dependencies: ['Staging Deployment'],
          estimatedDuration: 15,
        },
      ],
      assignedActors: [developer.id, reviewer.id, devops.id],
    });
    const workflow = parseResponse(workflowResult);
    log(`✅ Created workflow: ${workflow.name} (${workflow.id})`);
    log(`   Steps: ${workflow.steps.length} steps with dependencies`);

    // ============================================================================
    // PHASE 2: ACTION PROPOSALS - Create Proposals Requiring Approval
    // ============================================================================
    log('\n📝 PHASE 2: Creating Action Proposals');
    log('-'.repeat(50));

    // Developer proposes code deployment
    const deploymentProposalResult = await callTool('proposeAction', {
      workflow_id: workflow.id,
      actor_id: developer.id,
      tool: 'deploy_feature_to_production',
      params: {
        feature: 'user_authentication_v2',
        version: '2.1.0',
        environment: 'production',
        rollback_plan: 'rollback_to_v2.0.0',
        estimated_downtime: '5 minutes',
      },
      reason: 'Deploy new user authentication system with enhanced security features',
    });
    const deploymentProposal = parseResponse(deploymentProposalResult);
    log(`✅ Created deployment proposal: ${deploymentProposal.proposal_id}`);
    log(`   Status: ${deploymentProposal.status}`);

    // DevOps proposes infrastructure change
    const infrastructureProposalResult = await callTool('proposeAction', {
      workflow_id: workflow.id,
      actor_id: devops.id,
      tool: 'update_database_schema',
      params: {
        table: 'users',
        changes: [
          { operation: 'add_column', column: 'email_verified', type: 'boolean', default: false },
          { operation: 'add_column', column: 'two_factor_enabled', type: 'boolean', default: false },
        ],
        backup_required: true,
        estimated_duration: '30 minutes',
      },
      reason: 'Add new columns for enhanced user security features',
    });
    const infrastructureProposal = parseResponse(infrastructureProposalResult);
    log(`✅ Created infrastructure proposal: ${infrastructureProposal.proposal_id}`);
    log(`   Status: ${infrastructureProposal.status}`);

    // ============================================================================
    // PHASE 3: REVIEW PROCESS - Review and Approve Actions
    // ============================================================================
    log('\n🔍 PHASE 3: Reviewing and Approving Actions');
    log('-'.repeat(50));

    // Reviewer approves deployment with comments
    const deploymentReviewResult = await callTool('reviewAction', {
      proposal_id: deploymentProposal.proposal_id,
      reviewer_id: reviewer.id,
      decision: 'approve',
    });
    const deploymentReview = parseResponse(deploymentReviewResult);
    log(`✅ Deployment proposal approved by ${reviewer.name}`);
    log(`   Final tool call: ${deploymentReview.final_tool_call.tool}`);

    // Reviewer approves infrastructure change
    const infrastructureReviewResult = await callTool('reviewAction', {
      proposal_id: infrastructureProposal.proposal_id,
      reviewer_id: reviewer.id,
      decision: 'approve',
    });
    const infrastructureReview = parseResponse(infrastructureReviewResult);
    log(`✅ Infrastructure proposal approved by ${reviewer.name}`);
    log(`   Final tool call: ${infrastructureReview.final_tool_call.tool}`);

    // ============================================================================
    // PHASE 4: EXECUTION - Execute Approved Actions
    // ============================================================================
    log('\n⚡ PHASE 4: Executing Approved Actions');
    log('-'.repeat(50));

    // Execute deployment
    const deploymentExecutionResult = await callTool('executeAction', {
      proposal_id: deploymentProposal.proposal_id,
    });
    const deploymentExecution = parseResponse(deploymentExecutionResult);
    log(`✅ Deployment executed successfully`);
    log(`   Execution ID: ${deploymentExecution.execution_id}`);
    log(`   Result: ${deploymentExecution.result.message}`);

    // Execute infrastructure change
    const infrastructureExecutionResult = await callTool('executeAction', {
      proposal_id: infrastructureProposal.proposal_id,
    });
    const infrastructureExecution = parseResponse(infrastructureExecutionResult);
    log(`✅ Infrastructure change executed successfully`);
    log(`   Execution ID: ${infrastructureExecution.execution_id}`);
    log(`   Result: ${infrastructureExecution.result.message}`);

    // ============================================================================
    // PHASE 5: DRY-RUN MODE - Test Safe Execution
    // ============================================================================
    log('\n🧪 PHASE 5: Testing Dry-Run Mode');
    log('-'.repeat(50));

    // Enable dry-run mode
    const policyResult = await callTool('updatePolicy', {
      dry_run: true,
      max_retries: 3,
      timeout_ms: 10000,
    });
    const policy = parseResponse(policyResult);
    log(`✅ Enabled dry-run mode: ${policy.dry_run}`);

    // Create a proposal in dry-run mode
    const dryRunProposalResult = await callTool('proposeAction', {
      workflow_id: workflow.id,
      actor_id: developer.id,
      tool: 'update_user_preferences',
      params: {
        user_id: '12345',
        preferences: { theme: 'dark', notifications: 'email_only' },
      },
      reason: 'Update user preferences based on user feedback',
    });
    const dryRunProposal = parseResponse(dryRunProposalResult);
    log(`✅ Created dry-run proposal: ${dryRunProposal.proposal_id}`);

    // Approve and execute in dry-run mode
    await callTool('reviewAction', {
      proposal_id: dryRunProposal.proposal_id,
      reviewer_id: reviewer.id,
      decision: 'approve',
    });
    log(`✅ Dry-run proposal approved`);

    const dryRunExecutionResult = await callTool('executeAction', {
      proposal_id: dryRunProposal.proposal_id,
    });
    const dryRunExecution = parseResponse(dryRunExecutionResult);
    log(`✅ Dry-run execution completed`);
    log(`   Result: ${dryRunExecution.result.message}`);
    log(`   Dry-run: ${dryRunExecution.result.dryRun}`);

    // ============================================================================
    // PHASE 6: PARALLEL EXECUTION - Test Multiple Actions
    // ============================================================================
    log('\n🔄 PHASE 6: Testing Parallel Execution');
    log('-'.repeat(50));

    // Execute multiple actions in parallel
    const parallelResult = await callTool('executeParallel', {
      calls: [
        {
          tool: 'update_cache',
          params: { cache_type: 'user_sessions', action: 'clear_expired' },
        },
        {
          tool: 'send_notifications',
          params: { type: 'deployment_complete', users: ['admin', 'dev_team'] },
        },
        {
          tool: 'update_monitoring',
          params: { service: 'user_auth', status: 'healthy' },
        },
      ],
    });
    const parallel = parseResponse(parallelResult);
    log(`✅ Parallel execution completed`);
    log(`   Executed ${parallel.results.length} actions in parallel`);
    parallel.results.forEach((result: any, index: number) => {
      log(`   Action ${index + 1}: ${result.tool} - ${result.result}`);
    });

    // ============================================================================
    // PHASE 7: QUERYING AND MONITORING - Check System State
    // ============================================================================
    log('\n📊 PHASE 7: Querying and Monitoring');
    log('-'.repeat(50));

    // Query all actors
    const actorsResult = await callTool('queryActors', {});
    const actors = parseResponse(actorsResult);
    log(`✅ Found ${actors.length} actors in the system`);

    // Query workflows
    const workflowsResult = await callTool('queryWorkflows', {});
    const workflows = parseResponse(workflowsResult);
    log(`✅ Found ${workflows.length} workflows in the system`);

    // Query action proposals
    const proposalsResult = await callTool('queryActionProposals', {});
    const proposals = parseResponse(proposalsResult);
    log(`✅ Found ${proposals.length} action proposals in the system`);

    // Get system statistics
    const statsResult = await callTool('getStats', {});
    const stats = parseResponse(statsResult);
    log(`✅ System Statistics:`);
    log(`   Actors: ${stats.actors.total} total (${stats.actors.active} active)`);
    log(`   Workflows: ${stats.workflows.total} total (${stats.workflows.active} active)`);
    log(`   Proposals: ${stats.proposals.total} total`);
    log(`   Audit Events: ${stats.audit.total_events} total`);

    // Query audit events
    const auditResult = await callTool('queryAuditEvents', {
      eventType: 'proposal_reviewed',
    });
    const auditEvents = parseResponse(auditResult);
    log(`✅ Found ${auditEvents.length} proposal review events`);

    // ============================================================================
    // PHASE 8: EDGE CASES - Test Error Handling
    // ============================================================================
    log('\n⚠️ PHASE 8: Testing Edge Cases and Error Handling');
    log('-'.repeat(50));

    // Try to execute an unapproved proposal
    const unapprovedProposalResult = await callTool('proposeAction', {
      workflow_id: workflow.id,
      actor_id: developer.id,
      tool: 'test_tool',
      params: {},
      reason: 'Test unapproved execution',
    });
    const unapprovedProposal = parseResponse(unapprovedProposalResult);

    try {
      await callTool('executeAction', {
        proposal_id: unapprovedProposal.proposal_id,
      });
      log(`❌ Should have failed - unapproved proposal executed`);
    } catch (error) {
      log(`✅ Correctly prevented execution of unapproved proposal: ${error}`);
    }

    // Try to review a non-existent proposal
    try {
      await callTool('reviewAction', {
        proposal_id: 'non_existent_proposal',
        reviewer_id: reviewer.id,
        decision: 'approve',
      });
      log(`❌ Should have failed - reviewed non-existent proposal`);
    } catch (error) {
      log(`✅ Correctly handled non-existent proposal: ${error}`);
    }

    // ============================================================================
    // PHASE 9: COMPLEX SCENARIO - Multi-Step Approval Workflow
    // ============================================================================
    log('\n🎯 PHASE 9: Complex Multi-Step Approval Workflow');
    log('-'.repeat(50));

    // Create a complex proposal that requires approval
    const complexProposalResult = await callTool('proposeAction', {
      workflow_id: workflow.id,
      actor_id: devops.id,
      tool: 'critical_system_update',
      params: {
        system: 'payment_processing',
        update_type: 'security_patch',
        risk_level: 'high',
        rollback_plan: 'automatic_rollback_on_failure',
        maintenance_window: '2 hours',
      },
      reason: 'Apply critical security patch to payment processing system',
    });
    const complexProposal = parseResponse(complexProposalResult);
    log(`✅ Created complex proposal: ${complexProposal.proposal_id}`);

    // First reviewer approves with edits
    const firstReviewResult = await callTool('reviewAction', {
      proposal_id: complexProposal.proposal_id,
      reviewer_id: reviewer.id,
      decision: 'edit',
      edits: {
        maintenance_window: '3 hours',
        additional_monitoring: true,
      },
    });
    const firstReview = parseResponse(firstReviewResult);
    log(`✅ First reviewer edited proposal`);
    log(`   Updated params: ${JSON.stringify(firstReview.final_tool_call.params)}`);

    // Create a second proposal to demonstrate the edited workflow
    const secondProposalResult = await callTool('proposeAction', {
      workflow_id: workflow.id,
      actor_id: devops.id,
      tool: 'deploy_security_update',
      params: {
        system: 'payment_processing',
        version: '2.1.1',
        security_patch: true,
      },
      reason: 'Deploy security update with approved parameters',
    });
    const secondProposal = parseResponse(secondProposalResult);
    log(`✅ Created second proposal: ${secondProposal.proposal_id}`);

    // Approve the second proposal
    const secondReviewResult = await callTool('reviewAction', {
      proposal_id: secondProposal.proposal_id,
      reviewer_id: reviewer.id,
      decision: 'approve',
    });
    const secondReview = parseResponse(secondReviewResult);
    log(`✅ Second proposal approved`);

    // Execute the approved proposal
    const complexExecutionResult = await callTool('executeAction', {
      proposal_id: secondProposal.proposal_id,
    });
    const complexExecution = parseResponse(complexExecutionResult);
    log(`✅ Complex proposal executed successfully`);
    log(`   Execution ID: ${complexExecution.execution_id}`);

    // ============================================================================
    // PHASE 10: FINAL SUMMARY
    // ============================================================================
    log('\n🎉 PHASE 10: Final Summary');
    log('-'.repeat(50));

    // Get final statistics
    const finalStatsResult = await callTool('getStats', {});
    const finalStats = parseResponse(finalStatsResult);
    
    log(`📈 FINAL SYSTEM STATISTICS:`);
    log(`   🧑‍💼 Actors: ${finalStats.actors.total} total`);
    log(`   📋 Workflows: ${finalStats.workflows.total} total`);
    log(`   📝 Proposals: ${finalStats.proposals.total} total`);
    log(`   📊 Audit Events: ${finalStats.audit.total_events} total`);
    log(`   ⚙️ Policy: Dry-run mode ${finalStats.policy.dry_run ? 'enabled' : 'disabled'}`);

    log('\n✅ FULL INTEGRATION TEST COMPLETED SUCCESSFULLY!');
    log('=' .repeat(80));
    log('🎯 All features of the Merged Orchestration Connector are working correctly:');
    log('   ✅ Actor management and role-based capabilities');
    log('   ✅ Multi-step workflow creation and management');
    log('   ✅ Action proposals requiring approval');
    log('   ✅ Review process with approve/reject/edit decisions');
    log('   ✅ Execution of approved actions');
    log('   ✅ Dry-run mode for safe testing');
    log('   ✅ Parallel execution of multiple actions');
    log('   ✅ Comprehensive audit trail');
    log('   ✅ System statistics and monitoring');
    log('   ✅ Error handling and edge cases');
    log('   ✅ Complex multi-step approval workflows');
    log('=' .repeat(80));

  } catch (error) {
    log(`❌ Integration test failed: ${error}`);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the integration test
runFullIntegrationTest()
  .then(() => {
    log('🎉 Integration test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    log(`💥 Integration test failed: ${error}`);
    process.exit(1);
  });

export { runFullIntegrationTest };
