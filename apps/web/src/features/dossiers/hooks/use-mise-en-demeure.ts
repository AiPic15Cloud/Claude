import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface MiseEnDemeure {
  subject: string;
  body: string;
}

export function useGenerateMiseEnDemeure(dealId: string) {
  return useMutation({
    mutationFn: () => api.get<MiseEnDemeure>(`/deals/${dealId}/mise-en-demeure`),
  });
}
