import { type BillingCatalogEntry } from '../constants/billingCatalog';

export type BillingRuntimePlatform = 'web' | 'android' | 'ios';

export const getBillingRuntimePlatform = (): BillingRuntimePlatform => {
  const capacitor = (globalThis as unknown as { Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean } }).Capacitor;
  if (!capacitor?.isNativePlatform?.()) return 'web';

  const platform = String(capacitor.getPlatform?.() || '').toLowerCase();
  if (platform === 'ios') return 'ios';
  if (platform === 'android') return 'android';
  return 'android';
};

export const formatBrl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const getCheckoutChannelLabel = () => {
  const platform = getBillingRuntimePlatform();
  if (platform === 'android') return 'Google Play';
  if (platform === 'ios') return 'App Store';
  return import.meta.env.DEV ? 'Preview web' : 'Checkout web';
};

export const canUseDevBillingPreview = () =>
  getBillingRuntimePlatform() === 'web' && import.meta.env.DEV;

export const getBillingReadinessCopy = (product: BillingCatalogEntry) => {
  const platform = getBillingRuntimePlatform();

  if (platform === 'android') {
    return `Produto preparado para Google Play: ${product.googlePlayProductId}.`;
  }

  if (platform === 'ios') {
    return `Produto preparado para App Store: ${product.appStoreProductId}.`;
  }

  if (import.meta.env.DEV) {
    return 'Preview local: testa saldo e loja sem cobrar dinheiro real.';
  }

  return 'Checkout web ainda precisa ser ligado no backend antes de cobrar dinheiro real.';
};
