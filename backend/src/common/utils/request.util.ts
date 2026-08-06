import type { Request } from 'express';

export interface ClientInfo {
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  operatingSystem: string | null;
  deviceName: string | null;
}

export function getClientInfo(req: Request): ClientInfo {
  const ua = req.headers['user-agent'] ?? null;
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : forwarded || req.ip || req.socket?.remoteAddress || null;

  return {
    ipAddress: ip,
    userAgent: ua,
    browser: null,
    operatingSystem: null,
    deviceName: null,
  };
}
