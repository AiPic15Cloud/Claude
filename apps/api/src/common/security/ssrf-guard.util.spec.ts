import * as dns from 'dns';
import { assertPublicHttpUrl, fetchPublicHttpUrl, SsrfBlockedUrlError } from './ssrf-guard.util';

describe('assertPublicHttpUrl — blocages statiques (aucun réseau nécessaire)', () => {
  it('rejette un schéma non http(s)', async () => {
    await expect(assertPublicHttpUrl('ftp://example.com')).rejects.toThrow(SsrfBlockedUrlError);
  });

  it('rejette des identifiants dans l\'URL', async () => {
    await expect(assertPublicHttpUrl('http://user:pass@example.com')).rejects.toThrow(SsrfBlockedUrlError);
  });

  it('rejette localhost et les hôtes .local', async () => {
    await expect(assertPublicHttpUrl('http://localhost:1234')).rejects.toThrow(SsrfBlockedUrlError);
    await expect(assertPublicHttpUrl('http://printer.local')).rejects.toThrow(SsrfBlockedUrlError);
  });

  it('rejette une adresse IPv4 littérale privée/loopback/lien-local (dont le endpoint de métadonnées cloud)', async () => {
    await expect(assertPublicHttpUrl('http://127.0.0.1:8080')).rejects.toThrow(SsrfBlockedUrlError);
    await expect(assertPublicHttpUrl('http://10.0.0.5')).rejects.toThrow(SsrfBlockedUrlError);
    await expect(assertPublicHttpUrl('http://192.168.1.1')).rejects.toThrow(SsrfBlockedUrlError);
    await expect(assertPublicHttpUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(SsrfBlockedUrlError);
  });

  it('accepte une IP littérale publique sans résolution DNS', async () => {
    const { url, addresses } = await assertPublicHttpUrl('http://8.8.8.8');
    expect(url.hostname).toBe('8.8.8.8');
    expect(addresses).toEqual([{ address: '8.8.8.8', family: 4 }]);
  });
});

describe('fetchPublicHttpUrl — pas de seconde résolution DNS indépendante à la connexion (garde anti DNS-rebinding)', () => {
  it('rejette un hôte dont la résolution DNS pointe vers une plage privée — preuve que la résolution mockée est bien celle utilisée pour la décision, pas une résolution système parallèle', async () => {
    const lookupSpy = jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '10.1.2.3', family: 4 }] as never);
    try {
      await expect(fetchPublicHttpUrl('http://rebinding-attempt.test/')).rejects.toThrow(SsrfBlockedUrlError);
      // Un seul appel : si le code faisait ensuite une résolution système
      // indépendante à la connexion (le trou DNS-rebinding), on ne pourrait
      // jamais l'observer depuis ce mock — la garantie tient précisément au
      // fait qu'aucun second appel n'a de raison d'exister.
      expect(lookupSpy).toHaveBeenCalledTimes(1);
      expect(lookupSpy).toHaveBeenCalledWith('rebinding-attempt.test', expect.anything());
    } finally {
      lookupSpy.mockRestore();
    }
  });
});
