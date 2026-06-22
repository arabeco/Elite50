import { type BillingCatalogEntry } from '../constants/billingCatalog';
import { Capacitor, registerPlugin } from '@capacitor/core';

export type BillingRuntimePlatform = 'web' | 'android' | 'ios';
export type NativePurchaseResult = {
  ok: boolean;
  productCode: string;
  productId: string;
  platform: BillingRuntimePlatform;
  purchaseToken?: string | null;
  orderId?: string | null;
  purchaseState?: string | null;
  packageName?: string | null;
  rawPayload?: Record<string, unknown>;
  reason?: 'WEB_RUNTIME' | 'NATIVE_BILLING_BRIDGE_MISSING' | 'NATIVE_PURCHASE_FAILED';
};

type NativeBillingBridge = {
  purchaseProduct?: (payload: {
    productCode: string;
    productId: string;
    kind: BillingCatalogEntry['kind'];
  }) => Promise<Partial<NativePurchaseResult> & Record<string, unknown>>;
};

type Elite2050BillingPlugin = {
  getStatus?: () => Promise<Record<string, unknown>>;
  getProduct?: (payload: {
    productId: string;
    kind: BillingCatalogEntry['kind'];
  }) => Promise<Record<string, unknown>>;
  purchaseProduct: (payload: {
    productCode: string;
    productId: string;
    kind: BillingCatalogEntry['kind'];
  }) => Promise<Partial<NativePurchaseResult> & Record<string, unknown>>;
  getActivePurchases?: () => Promise<{ ok: boolean; purchases?: Array<Record<string, unknown>> }>;
  queryActivePurchases?: () => Promise<{ ok: boolean; purchases?: Array<Record<string, unknown>> }>;
};

const Elite2050Billing = registerPlugin<Elite2050BillingPlugin>('Elite2050Billing');

export const getBillingRuntimePlatform = (): BillingRuntimePlatform => {
  if (!Capacitor.isNativePlatform()) return 'web';

  const platform = String(Capacitor.getPlatform() || '').toLowerCase();
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

export const getNativeProductId = (product: BillingCatalogEntry) => {
  const platform = getBillingRuntimePlatform();
  if (platform === 'ios') return product.appStoreProductId;
  return product.googlePlayProductId;
};

export const canUseDevBillingPreview = () =>
  getBillingRuntimePlatform() === 'web' && import.meta.env.DEV;

export const startNativeProductPurchase = async (product: BillingCatalogEntry): Promise<NativePurchaseResult> => {
  const platform = getBillingRuntimePlatform();
  const productId = getNativeProductId(product);

  if (platform === 'web') {
    return {
      ok: false,
      productCode: product.code,
      productId,
      platform,
      reason: 'WEB_RUNTIME',
    };
  }

  try {
    const globalBridge = (globalThis as unknown as { Elite2050NativeBilling?: NativeBillingBridge }).Elite2050NativeBilling;
    const bridge = globalBridge?.purchaseProduct ? globalBridge : Elite2050Billing;
    if (!bridge?.purchaseProduct) {
      return {
        ok: false,
        productCode: product.code,
        productId,
        platform,
        reason: 'NATIVE_BILLING_BRIDGE_MISSING',
      };
    }

    const result = await bridge.purchaseProduct({
      productCode: product.code,
      productId,
      kind: product.kind,
    });

    return {
      ok: result.ok === true,
      productCode: product.code,
      productId,
      platform,
      purchaseToken: typeof result.purchaseToken === 'string' ? result.purchaseToken : null,
      orderId: typeof result.orderId === 'string' ? result.orderId : null,
      purchaseState: typeof result.purchaseState === 'string' ? result.purchaseState : 'purchased',
      packageName: typeof result.packageName === 'string' ? result.packageName : null,
      rawPayload: result,
      reason: result.ok === true ? undefined : 'NATIVE_PURCHASE_FAILED',
    };
  } catch (error) {
    return {
      ok: false,
      productCode: product.code,
      productId,
      platform,
      rawPayload: { error: error instanceof Error ? error.message : String(error) },
      reason: 'NATIVE_PURCHASE_FAILED',
    };
  }
};

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
