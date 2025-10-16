import { ALLOWED_ROLES, isAllowedRole } from './auth.constants';

describe('auth.constants', () => {
  it('proves the role allowlist exposes backend and user entries', () => {
    expect(ALLOWED_ROLES).toEqual(['backend', 'user']);
  });

  it.each(ALLOWED_ROLES)(
    'proves isAllowedRole accepts allowlisted role "%s"',
    (role) => {
      expect(isAllowedRole(role)).toBe(true);
    },
  );

  it.each([undefined, null, '', 'admin', 123])(
    'proves isAllowedRole rejects non-allowlisted role "%s"',
    (value) => {
      expect(isAllowedRole(value)).toBe(false);
    },
  );
});
