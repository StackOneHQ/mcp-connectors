// packages/mcp-connectors/src/connectors/AppleScript/lib/guard.ts

export interface SecurityCheck {
  allowed: boolean;
  reason?: string;
  warning?: string;
}

export interface RequestValidation {
  valid: boolean;
  error?: string;
}

/**
 * Dangerous patterns that should never appear in AppleScript requests or generated code
 */
const DANGEROUS_PATTERNS = [
  // Shell access
  /do shell script/gi,
  /shell script/gi,
  
  // System directories and files
  /\/System\//gi,
  /\/usr\//gi,
  /\/bin\//gi,
  /\/sbin\//gi,
  /\/etc\//gi,
  /\/var\/root/gi,
  /\/private\//gi,
  
  // Administrative commands
  /sudo/gi,
  /rm -rf/gi,
  /chmod/gi,
  /chown/gi,
  /passwd/gi,
  /su root/gi,
  
  // Network and security
  /curl/gi,
  /wget/gi,
  /ssh/gi,
  /scp/gi,
  /ftp/gi,
  /telnet/gi,
  
  // Dangerous utilities
  /launchctl/gi,
  /systemsetup/gi,
  /scutil/gi,
  /diskutil/gi,
  /hdiutil/gi,
  /installer/gi,
  
  // Code execution
  /eval/gi,
  /exec/gi,
  /system\(/gi,
  
  // File operations on system areas
  /delete.*\/System/gi,
  /delete.*\/usr/gi,
  /move.*\/System/gi,
  /move.*\/usr/gi,
];

/**
 * Suspicious patterns that generate warnings
 */
const SUSPICIOUS_PATTERNS = [
  /keystroke/gi,
  /key code/gi,
  /click.*button/gi,
  /GUI scripting/gi,
  /System Events.*keystroke/gi,
  /password/gi,
  /credential/gi,
  /security/gi,
];

/**
 * Required patterns that indicate valid AppleScript
 */
const APPLESCRIPT_PATTERNS = [
  /tell application/gi,
  /display dialog/gi,
  /display notification/gi,
  /set.*to/gi,
  /get.*of/gi,
  /if.*then/gi,
  /repeat.*times/gi,
  /try.*end try/gi,
];

export class SecurityGuard {
  private dangerousPatterns: RegExp[];
  private suspiciousPatterns: RegExp[];
  private appleScriptPatterns: RegExp[];

  constructor() {
    this.dangerousPatterns = DANGEROUS_PATTERNS;
    this.suspiciousPatterns = SUSPICIOUS_PATTERNS;
    this.appleScriptPatterns = APPLESCRIPT_PATTERNS;
  }

  /**
   * Check if a request contains dangerous patterns
   */
  checkRequest(prompt: string, context?: string): SecurityCheck {
    const fullText = `${prompt} ${context || ''}`.toLowerCase();
    
    // Check for dangerous patterns
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(fullText)) {
        return {
          allowed: false,
          reason: `Request contains forbidden pattern: ${pattern.source}`
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if generated AppleScript code is safe
   */
  checkScript(script: string): SecurityCheck {
    if (!script || script.trim().length === 0) {
      return {
        allowed: false,
        reason: 'Empty script generated'
      };
    }

    const lowerScript = script.toLowerCase();

    // Check for dangerous patterns in generated code
    for (const pattern of this.dangerousPatterns) {
      if (pattern.test(lowerScript)) {
        return {
          allowed: false,
          reason: `Generated script contains forbidden pattern: ${pattern.source}`
        };
      }
    }

    // Check if it looks like AppleScript
    const hasAppleScriptPattern = this.appleScriptPatterns.some(pattern => 
      pattern.test(lowerScript)
    );

    if (!hasAppleScriptPattern && script.length > 50) {
      return {
        allowed: false,
        reason: 'Generated code does not appear to be valid AppleScript'
      };
    }

    // Check for suspicious patterns (warnings only)
    let warning: string | undefined;
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(lowerScript)) {
        warning = `Generated script contains potentially risky pattern: ${pattern.source}`;
        break;
      }
    }

    return { 
      allowed: true,
      warning 
    };
  }
}

/**
 * Validate the format of an AppleScript generation request
 */
export function validateAppleScriptRequest(request: any): RequestValidation {
  if (!request || typeof request !== 'object') {
    return {
      valid: false,
      error: 'Request must be a JSON object'
    };
  }

  if (!request.prompt || typeof request.prompt !== 'string') {
    return {
      valid: false,
      error: 'Request must include a "prompt" string field'
    };
  }

  if (request.prompt.length === 0) {
    return {
      valid: false,
      error: 'Prompt cannot be empty'
    };
  }

  if (request.prompt.length > 2000) {
    return {
      valid: false,
      error: 'Prompt too long (max 2000 characters)'
    };
  }

  if (request.context && typeof request.context !== 'string') {
    return {
      valid: false,
      error: 'Context must be a string if provided'
    };
  }

  if (request.context && request.context.length > 1000) {
    return {
      valid: false,
      error: 'Context too long (max 1000 characters)'
    };
  }

  return { valid: true };
}

/**
 * Create a new security guard instance
 */
export function createSecurityGuard(): SecurityGuard {
  return new SecurityGuard();
}