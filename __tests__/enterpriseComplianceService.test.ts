class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('EnterpriseComplianceService', () => {
  let enterpriseComplianceService: typeof import('../src/renderer/services/enterpriseCompliance').enterpriseComplianceService;

  beforeEach(() => {
    jest.resetModules();

    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });

    ({ enterpriseComplianceService } = require('../src/renderer/services/enterpriseCompliance'));
  });

  test('supports SAML and OIDC login flows with state validation', () => {
    enterpriseComplianceService.updateSSOConfig({
      saml: {
        enabled: true,
        entryPoint: 'https://idp.example.com/saml',
        issuer: 'inferencerc-enterprise',
        certificate: '-----BEGIN CERT-----mock',
        relayState: 'relay-1',
      },
      oidc: {
        enabled: true,
        issuerUrl: 'https://idp.example.com',
        authorizationEndpoint: 'https://idp.example.com/auth',
        tokenEndpoint: 'https://idp.example.com/token',
        clientId: 'enterprise-client',
        scopes: ['openid', 'profile', 'email'],
      },
    });

    const samlStart = enterpriseComplianceService.startSAMLLogin();
    const samlSession = enterpriseComplianceService.completeSSOLogin({
      protocol: 'saml2',
      state: samlStart.state,
      email: 'admin@company.com',
      displayName: 'Admin User',
    });

    expect(samlSession.protocol).toBe('saml2');
    expect(enterpriseComplianceService.getSSOSession()?.email).toBe('admin@company.com');

    enterpriseComplianceService.clearSSOSession();

    const oidcStart = enterpriseComplianceService.startOIDCLogin();
    const oidcSession = enterpriseComplianceService.completeSSOLogin({
      protocol: 'oidc',
      state: oidcStart.state,
      email: 'security@company.com',
      displayName: 'Security User',
    });

    expect(oidcSession.protocol).toBe('oidc');
    expect(enterpriseComplianceService.getSSOSession()?.displayName).toBe('Security User');

    const logs = enterpriseComplianceService.getAuditLogs({ category: 'enterprise.sso' });
    expect(logs.some(entry => entry.action.includes('login.completed'))).toBe(true);
  });

  test('applies retention policy pruning to expired logs', () => {
    enterpriseComplianceService.updateRetentionPolicy({
      enabled: true,
      retentionDays: 1,
      purgeIntervalHours: 1,
    });

    const now = Date.now();
    const oldTimestamp = now - (3 * 24 * 60 * 60 * 1000);

    const seeded = [
      {
        id: 'old-log',
        timestamp: oldTimestamp,
        category: 'chat.session',
        action: 'created',
        result: 'success',
        actor: { id: 'u1', name: 'User One' },
        details: {},
      },
      {
        id: 'new-log',
        timestamp: now,
        category: 'chat.session',
        action: 'loaded',
        result: 'success',
        actor: { id: 'u1', name: 'User One' },
        details: {},
      },
    ];

    localStorage.setItem('enterprise_audit_logs_v1', JSON.stringify(seeded));

    const removed = enterpriseComplianceService.pruneExpiredLogs(now + (2 * 60 * 60 * 1000));
    expect(removed).toBe(1);

    const logs = enterpriseComplianceService.getAuditLogs();
    expect(logs.some(entry => entry.id === 'old-log')).toBe(false);
    expect(logs.some(entry => entry.id === 'new-log')).toBe(true);
  });

  test('exports GDPR and SOC2 reports with configurable PII redaction', () => {
    enterpriseComplianceService.logEvent({
      category: 'cloudsync.auth',
      action: 'login',
      result: 'success',
      details: {
        email: 'privacy@company.com',
        accessToken: 'secret-token',
        ipAddress: '10.0.0.1',
      },
      piiFields: ['email', 'accessToken', 'ipAddress'],
    });

    const gdpr = enterpriseComplianceService.exportComplianceReport({
      standard: 'gdpr',
      format: 'json',
      includePII: false,
    });

    const gdprPayload = JSON.parse(gdpr.content);
    expect(gdprPayload.standard).toBe('gdpr');
    expect(gdprPayload.controls.some((item: string) => item.includes('Article'))).toBe(true);
    expect(gdprPayload.records[0].details.email).toBe('[REDACTED]');

    const soc2Csv = enterpriseComplianceService.exportComplianceReport({
      standard: 'soc2',
      format: 'csv',
      includePII: true,
    });

    expect(soc2Csv.fileName.endsWith('.csv')).toBe(true);
    expect(soc2Csv.content.includes('privacy@company.com')).toBe(true);
  });
});
