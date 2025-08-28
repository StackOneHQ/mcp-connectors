// packages/mcp-connectors/src/connectors/AppleScript/lib/signer.ts
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Generate HMAC signature for request authentication
 */
export function generateSignature(
  payload: string,
  timestamp: number,
  secret: string
): string {
  const message = `${timestamp}:${payload}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(message);
  return hmac.digest('hex');
}

/**
 * Verify HMAC signature for request authentication
 */
export function verifySignature(
  payload: string,
  signature: string,
  timestamp: number,
  secret: string,
  maxAgeMs: number = 300000 // 5 minutes default
): boolean {
  // Check timestamp to prevent replay attacks
  const now = Date.now();
  const age = now - timestamp;
  
  if (age > maxAgeMs || age < -30000) { // Allow 30s clock skew
    console.warn(`Request timestamp out of range: age=${age}ms, max=${maxAgeMs}ms`);
    return false;
  }

  // Generate expected signature
  const expectedSignature = generateSignature(payload, timestamp, secret);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    const providedBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    console.warn('Signature verification error:', error);
    return false;
  }
}

/**
 * Create a signed request payload
 */
export function createSignedRequest(
  payload: any,
  secret: string
): { payload: any; signature: string; timestamp: number } {
  const timestamp = Date.now();
  const payloadString = JSON.stringify(payload);
  const signature = generateSignature(payloadString, timestamp, secret);
  
  return {
    payload: {
      ...payload,
      signature,
      timestamp
    },
    signature,
    timestamp
  };
}

/**
 * Validate signature format
 */
export function isValidSignatureFormat(signature: string): boolean {
  return /^[0-9a-f]{64}$/i.test(signature);
}

/**
 * Generate a random secret key
 */
export function generateSecret(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}