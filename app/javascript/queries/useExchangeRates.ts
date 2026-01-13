import { useQuery } from '@tanstack/react-query';
import { ExchangeRatesService } from '../types/generated';

export function useExchangeRates() {
  return useQuery({
    queryKey: ['exchangeRates', 'current'],
    queryFn: async () => {
      return ExchangeRatesService.getV1ExchangeRatesCurrent();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useConvertCurrency(amount: number, from: string, to: string) {
  return useQuery({
    queryKey: ['exchangeRates', 'convert', amount, from, to],
    queryFn: async () => {
      return ExchangeRatesService.getV1ExchangeRatesConvert({
        amount,
        from: from as 'INR' | 'USD' | 'EUR' | 'GBP',
        to: to as 'INR' | 'USD' | 'EUR' | 'GBP',
      });
    },
    enabled: !!amount && !!from && !!to && from !== to,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useExchangeRate(from: string, to: string) {
  return useQuery({
    queryKey: ['exchangeRates', 'rate', from, to],
    queryFn: async () => {
      return ExchangeRatesService.getV1ExchangeRatesRate({
        from: from as 'INR' | 'USD' | 'EUR' | 'GBP',
        to: to as 'INR' | 'USD' | 'EUR' | 'GBP',
      });
    },
    enabled: !!from && !!to,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
