import { apiClient } from './client';
import type { ApiSuccess } from '../types';
import type {
  PaymentConfig,
  PaymentTransaction,
  PlanCatalogueResponse,
  PlanKey,
  ShopEntitlements,
  SubscriptionInvoice,
} from '../types/admin';

export async function getPlanCatalogue(): Promise<PlanCatalogueResponse> {
  const res = await apiClient.get<ApiSuccess<PlanCatalogueResponse>>('/subscriptions/plans');
  return res.data.data;
}

export async function getMyEntitlements(): Promise<ShopEntitlements[]> {
  const res = await apiClient.get<ApiSuccess<ShopEntitlements[]>>('/subscriptions/me');
  return res.data.data;
}

export async function getShopEntitlements(shopId: number): Promise<ShopEntitlements> {
  const res = await apiClient.get<ApiSuccess<ShopEntitlements>>(`/subscriptions/shops/${shopId}`);
  return res.data.data;
}

/** Whether checkout can be opened at all on this deployment. */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const res = await apiClient.get<ApiSuccess<PaymentConfig>>('/payments/config');
  return res.data.data;
}

/**
 * Starting or changing a paid plan is deliberately absent from this client.
 *
 * Google Play's Payments policy requires Play billing for "cloud software and
 * services" and "business productivity software" and exempts neither B2B nor
 * SaaS, so the Android app cannot open Razorpay's checkout - and the policy's
 * anti-steering rule means it cannot point at one either. The backend
 * endpoints still exist and the web app still uses them; only this client's
 * ability to call them is gone, so nothing in the APK can begin a purchase.
 *
 * `cancel` and `downgrade` stay below: neither is a purchase, and a merchant
 * must always be able to stop paying.
 */


/** Moves to a cheaper plan; takes effect when the paid period ends (§12). */
export async function downgrade(
  shopId: number,
  payload: { plan: PlanKey; note?: string },
): Promise<ShopEntitlements> {
  const res = await apiClient.post<ApiSuccess<ShopEntitlements>>(
    `/subscriptions/shops/${shopId}/downgrade`,
    payload,
  );
  return res.data.data;
}

/** Stops future billing; benefits run to the end of the paid period (§13). */
export async function cancelSubscription(shopId: number, note?: string): Promise<ShopEntitlements> {
  const res = await apiClient.post<ApiSuccess<ShopEntitlements>>(
    `/subscriptions/shops/${shopId}/cancel`,
    { note },
  );
  return res.data.data;
}

export async function getBillingHistory(shopId: number): Promise<PaymentTransaction[]> {
  const res = await apiClient.get<ApiSuccess<PaymentTransaction[]>>(
    `/subscriptions/shops/${shopId}/billing-history`,
  );
  return res.data.data;
}

export async function getInvoices(shopId: number): Promise<SubscriptionInvoice[]> {
  const res = await apiClient.get<ApiSuccess<SubscriptionInvoice[]>>(
    `/subscriptions/shops/${shopId}/invoices`,
  );
  return res.data.data;
}

export async function getInvoice(shopId: number, invoiceId: number): Promise<SubscriptionInvoice> {
  const res = await apiClient.get<ApiSuccess<SubscriptionInvoice>>(
    `/subscriptions/shops/${shopId}/invoices/${invoiceId}`,
  );
  return res.data.data;
}
