# Dry-Run Mode Guide

## Overview

The Orchestration Connector supports a **dry-run mode** that allows you to safely test all functionality without making actual remote calls or affecting external systems.

## Quick Start

### Enable Dry-Run Mode

```typescript
import { orchestrationState } from './state';

// Enable dry-run mode
orchestrationState.updatePolicy({ dry_run: true });
```

### Disable Dry-Run Mode

```typescript
// Disable dry-run mode for production use
orchestrationState.updatePolicy({ dry_run: false });
```

## What Dry-Run Mode Does

### ✅ **Simulated Operations**
- **Remote Calls**: All `forwardToRemote()` and `executeWithRetry()` calls return simulated success responses
- **Audit Events**: All operations still create audit events for tracking
- **State Management**: All local state operations work normally (actors, workflows, proposals)
- **Queries**: All query operations work normally

### 🔒 **Safe Testing**
- No actual network requests are made
- No external systems are affected
- Perfect for development and testing environments
- Can be enabled/disabled at runtime

## Example Usage

### Basic Dry-Run Test

```typescript
import { orchestrationState } from './state';
import { forwardToRemote } from './execute';

// Enable dry-run mode
orchestrationState.updatePolicy({ dry_run: true });

// Test remote execution (will be simulated)
const result = await forwardToRemote('test_tool', { param: 'value' });
console.log(result);
// Output: { success: true, data: { ok: true, simulated: true }, simulated: true }

// Create actors and workflows (works normally)
const actor = orchestrationState.createActor({
  name: 'Test Actor',
  role: 'Test Role',
  capabilities: ['test'],
});

// Query data (works normally)
const actors = orchestrationState.queryActors({});
console.log('Actors:', actors.length); // 1
```

### Complete Workflow Test

```typescript
// Enable dry-run mode
orchestrationState.updatePolicy({ dry_run: true });

// Create a complete workflow
const developer = orchestrationState.createActor({
  name: 'Developer',
  role: 'Software Engineer',
  capabilities: ['code_review', 'testing'],
});

const workflow = orchestrationState.createWorkflow({
  name: 'Code Review',
  description: 'Test workflow',
  priority: 'high',
  steps: [
    {
      name: 'Review',
      description: 'Code review step',
      actorId: developer.id,
      estimatedDuration: 2,
    }
  ],
  assignedActors: [developer.id],
});

const proposal = orchestrationState.createProposal({
  title: 'Test Proposal',
  description: 'Test proposal',
  priority: 'medium',
  assignedReviewers: [developer.id],
});

// Test remote execution (simulated)
const remoteResult = await forwardToRemote('approve_proposal', {
  proposalId: proposal.id,
  approver: developer.id,
});

console.log('Remote result:', remoteResult.simulated); // true
```

## Policy Configuration

### Full Policy Options

```typescript
orchestrationState.updatePolicy({
  dry_run: true,        // Enable/disable dry-run mode
  max_retries: 3,       // Number of retry attempts (1-10)
  timeout_ms: 10000,    // Request timeout in milliseconds (1000-30000)
});
```

### Get Current Policy

```typescript
const policy = orchestrationState.getPolicy();
console.log('Current policy:', policy);
// Output: { dry_run: true, max_retries: 3, timeout_ms: 10000 }
```

## Testing Scenarios

### 1. Development Testing

```typescript
// Enable dry-run for development
orchestrationState.updatePolicy({ dry_run: true });

// Test your workflow logic safely
// All remote calls will be simulated
```

### 2. Integration Testing

```typescript
// Test with dry-run first
orchestrationState.updatePolicy({ dry_run: true });
await testWorkflow();

// Then test with real execution
orchestrationState.updatePolicy({ dry_run: false });
await testWorkflow();
```

### 3. Production Deployment

```typescript
// Ensure dry-run is disabled for production
orchestrationState.updatePolicy({ dry_run: false });

// Verify policy
const policy = orchestrationState.getPolicy();
if (policy.dry_run) {
  throw new Error('Dry-run mode should be disabled in production!');
}
```

## Best Practices

### ✅ **Do**
- Use dry-run mode for all development and testing
- Test workflows thoroughly in dry-run mode before production
- Use dry-run mode for demos and presentations
- Enable dry-run mode in CI/CD test environments

### ❌ **Don't**
- Use dry-run mode in production environments
- Rely on dry-run mode for performance testing
- Forget to disable dry-run mode before deployment

## Monitoring and Debugging

### Check Dry-Run Status

```typescript
const policy = orchestrationState.getPolicy();
console.log('Dry-run enabled:', policy.dry_run);
```

### Audit Events in Dry-Run Mode

```typescript
// All operations create audit events, even in dry-run mode
const auditEvents = orchestrationState.queryAuditEvents({
  eventType: 'tool_simulated',
});

console.log('Simulated operations:', auditEvents.length);
```

### Statistics

```typescript
const stats = orchestrationState.getStats();
console.log('Policy:', stats.policy);
// Shows current dry-run status and other settings
```

## Troubleshooting

### Common Issues

1. **Remote calls failing in normal mode**
   - Check if external servers are running
   - Verify network connectivity
   - Check timeout settings

2. **Unexpected behavior in dry-run mode**
   - Verify dry-run mode is enabled: `orchestrationState.getPolicy().dry_run`
   - Check that you're not making direct HTTP calls outside the connector

3. **Data not persisting**
   - Data should persist across mode switches
   - Use `orchestrationState.clearAll()` to reset if needed

### Debug Commands

```typescript
// Check current state
const stats = orchestrationState.getStats();
console.log('Current state:', stats);

// Check policy
const policy = orchestrationState.getPolicy();
console.log('Current policy:', policy);

// Clear all data
orchestrationState.clearAll();
```

## Demo Scripts

Run the included demo scripts to see dry-run mode in action:

```bash
# Comprehensive dry-run demo
npx tsx src/connectors/orchestration/dry-run-demo.ts

# Mode switching demo
npx tsx src/connectors/orchestration/mode-switching-demo.ts
```

## Summary

Dry-run mode is a powerful feature that allows you to:

- **Safely test** all orchestration functionality
- **Simulate remote calls** without affecting external systems
- **Develop and debug** workflows without network dependencies
- **Demo features** without requiring external services
- **Switch modes** at runtime for different environments

Always use dry-run mode during development and testing, and ensure it's disabled for production use.


