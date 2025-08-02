import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

export interface EmbedJWTPayload {
  organizationId: string;
  widgetId?: string;
  allowedOrigins?: string[];
  permissions: string[];
  exp: number;
  iat: number;
}

/**
 * Generate a JWT token for embed widgets
 */
export function generateEmbedToken(
  organizationId: string,
  options: {
    widgetId?: string;
    allowedOrigins?: string[];
    permissions?: string[];
    expiresInHours?: number;
  } = {}
): string {
  const {
    widgetId,
    allowedOrigins = [],
    permissions = ['read'],
    expiresInHours = 24,
  } = options;

  const secret = process.env.EMBED_JWT_SECRET;
  if (!secret) {
    throw new Error('EMBED_JWT_SECRET environment variable is required');
  }

  const payload: Omit<EmbedJWTPayload, 'exp' | 'iat'> = {
    organizationId,
    permissions,
  };

  if (widgetId) {
    payload.widgetId = widgetId;
  }

  if (allowedOrigins.length > 0) {
    payload.allowedOrigins = allowedOrigins;
  }

  return jwt.sign(payload, secret, {
    expiresIn: `${expiresInHours}h`,
  });
}

/**
 * Verify and decode an embed JWT token
 */
export function verifyEmbedToken(token: string): EmbedJWTPayload | null {
  try {
    const secret = process.env.EMBED_JWT_SECRET;
    if (!secret) {
      throw new Error('EMBED_JWT_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, secret) as EmbedJWTPayload;
    return decoded;
  } catch (error) {
    console.error('Embed token verification failed:', error);
    return null;
  }
}

/**
 * Middleware to authenticate embed requests
 */
export function authenticateEmbedToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.query.token as string || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({ 
      error: 'Embed token required',
      message: 'Please provide a valid embed token in query parameter or Authorization header'
    });
    return;
  }

  const payload = verifyEmbedToken(token);
  if (!payload) {
    res.status(401).json({ 
      error: 'Invalid embed token',
      message: 'The provided embed token is invalid or expired'
    });
    return;
  }

  // Check origin if specified in token
  const origin = req.get('Origin') || req.get('Referer');
  if (payload.allowedOrigins && payload.allowedOrigins.length > 0 && origin) {
    const isAllowed = payload.allowedOrigins.some(allowedOrigin => {
      // Support wildcard subdomains (e.g., *.example.com)
      if (allowedOrigin.startsWith('*.')) {
        const domain = allowedOrigin.slice(2);
        return origin.endsWith(domain);
      }
      return origin.includes(allowedOrigin);
    });

    if (!isAllowed) {
      res.status(403).json({ 
        error: 'Origin not allowed',
        message: `Origin ${origin} is not in the allowed list for this embed token`
      });
      return;
    }
  }

  // Attach payload to request for use in route handlers
  (req as any).embedAuth = payload;
  next();
}

/**
 * Check if the embed token has a specific permission
 */
export function requireEmbedPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const embedAuth = (req as any).embedAuth as EmbedJWTPayload;
    
    if (!embedAuth) {
      res.status(401).json({ 
        error: 'Embed authentication required',
        message: 'This endpoint requires embed authentication'
      });
      return;
    }

    if (!embedAuth.permissions.includes(permission) && !embedAuth.permissions.includes('*')) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires '${permission}' permission`
      });
      return;
    }

    next();
  };
}

/**
 * Generate embed token API endpoint
 */
export function createEmbedTokenEndpoint() {
  return async (req: Request, res: Response) => {
    try {
      const { organizationId, widgetId, allowedOrigins, permissions, expiresInHours } = req.body;

      if (!organizationId) {
        return res.status(400).json({ 
          error: 'Missing required field',
          message: 'organizationId is required'
        });
      }

      const token = generateEmbedToken(organizationId, {
        widgetId,
        allowedOrigins,
        permissions,
        expiresInHours,
      });

      // Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + (expiresInHours || 24) * 60 * 60 * 1000);

      res.json({
        success: true,
        token,
        expiresAt: expiresAt.toISOString(),
        config: {
          organizationId,
          widgetId,
          allowedOrigins: allowedOrigins || [],
          permissions: permissions || ['read'],
        },
      });
    } catch (error) {
      console.error('Error generating embed token:', error);
      res.status(500).json({ 
        error: 'Token generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

/**
 * Setup CORS for embed endpoints
 */
export function setupEmbedCORS() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['*'];
    const origin = req.get('Origin');

    // Set CORS headers for embed endpoints
    if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }

    next();
  };
}