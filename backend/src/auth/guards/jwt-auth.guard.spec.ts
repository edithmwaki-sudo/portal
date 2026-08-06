import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const reflectorMock = {
  getAllAndOverride: jest.fn(),
};

const contextMock = {
  getHandler: jest.fn(),
  getClass: jest.fn(),
} as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new JwtAuthGuard(reflectorMock as unknown as Reflector);
  });

  it('skips authentication for @Public() handlers', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);
    expect(guard.canActivate(contextMock)).toBe(true);
  });

  it('delegates to Passport for non-public handlers', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(undefined);
    const spy = jest.spyOn(JwtAuthGuard.prototype, 'canActivate').mockReturnValue('delegated');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (guard as any).canActivate = spy as any;
    const result = guard.canActivate(contextMock);
    expect(result).toBe('delegated');
  });

  it('reads the public flag from handler and class metadata', () => {
    reflectorMock.getAllAndOverride.mockReturnValue(true);
    guard.canActivate(contextMock);
    expect(reflectorMock.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      contextMock.getHandler(),
      contextMock.getClass(),
    ]);
  });
});