package com.becoslab.elite2050;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "Elite2050Billing")
public class Elite2050BillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private String pendingProductCode;
    private String pendingProductId;
    private String pendingKind;
    private final Map<String, ProductDetails> cachedProductDetails = new HashMap<>();
    private final List<Runnable> pendingConnectionActions = new ArrayList<>();
    private boolean isConnecting = false;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
        ensureConnected(() -> {});
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        if (billingClient != null) {
            billingClient.endConnection();
            billingClient = null;
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("connected", billingClient != null && billingClient.isReady());
        result.put("canMakePayments", billingClient != null);
        result.put("reason", billingClient == null ? "BILLING_CLIENT_NOT_READY" : null);
        result.put("responseCode", BillingClient.BillingResponseCode.OK);
        call.resolve(result);
    }

    @PluginMethod
    public void getProduct(PluginCall call) {
        String productId = call.getString("productId");
        String kind = call.getString("kind", "consumable");

        if (productId == null || productId.length() == 0) {
            call.reject("MISSING_PRODUCT");
            return;
        }

        ensureConnected(() -> queryProductDetails(productId, kind, productDetails -> {
            JSObject result = new JSObject();
            result.put("productId", productDetails.getProductId());
            result.put("title", productDetails.getTitle());
            result.put("description", productDetails.getDescription());
            result.put("formattedPrice", getFormattedPrice(productDetails));
            result.put("offerTokenAvailable", productDetails.getSubscriptionOfferDetails() != null && !productDetails.getSubscriptionOfferDetails().isEmpty());
            call.resolve(result);
        }, (code, message) -> call.reject(code, message)));
    }

    @PluginMethod
    public void purchaseProduct(PluginCall call) {
        String productCode = call.getString("productCode");
        String productId = call.getString("productId");
        String kind = call.getString("kind", "consumable");

        if (productCode == null || productCode.length() == 0 || productId == null || productId.length() == 0) {
            call.reject("MISSING_PRODUCT");
            return;
        }

        pendingPurchaseCall = call;
        pendingProductCode = productCode;
        pendingProductId = productId;
        pendingKind = kind;

        ensureConnected(() -> queryAndLaunchPurchase(productId, kind));
    }

    @PluginMethod
    public void getActivePurchases(PluginCall call) {
        queryActivePurchases(call);
    }

    @PluginMethod
    public void queryActivePurchases(PluginCall call) {
        ensureConnected(() -> billingClient.queryPurchasesAsync(
            com.android.billingclient.api.QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build(),
            (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject("QUERY_PURCHASES_FAILED", billingResult.getDebugMessage());
                    return;
                }

                JSObject result = new JSObject();
                JSArray items = new JSArray();
                for (Purchase purchase : purchases) {
                    items.put(purchaseToJson(purchase, null, null));
                }
                result.put("ok", true);
                result.put("purchases", items);
                call.resolve(result);
            }
        ));
    }

    private void ensureConnected(Runnable onReady) {
        if (billingClient != null && billingClient.isReady()) {
            onReady.run();
            return;
        }

        pendingConnectionActions.add(onReady);
        if (isConnecting) return;

        isConnecting = true;
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                isConnecting = false;
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    List<Runnable> actions = new ArrayList<>(pendingConnectionActions);
                    pendingConnectionActions.clear();
                    for (Runnable action : actions) {
                        action.run();
                    }
                    return;
                }
                pendingConnectionActions.clear();
                rejectPending("BILLING_SETUP_FAILED", billingResult.getDebugMessage());
            }

            @Override
            public void onBillingServiceDisconnected() {
                isConnecting = false;
                pendingConnectionActions.clear();
                rejectPending("BILLING_DISCONNECTED", "Google Play Billing disconnected");
            }
        });
    }

    private void queryAndLaunchPurchase(String productId, String kind) {
        queryProductDetails(productId, kind, productDetails -> {
            BillingFlowParams.ProductDetailsParams.Builder productDetailsParams =
                BillingFlowParams.ProductDetailsParams.newBuilder()
                    .setProductDetails(productDetails);

            String offerToken = getSubscriptionOfferToken(productDetails);
            if (offerToken != null) {
                productDetailsParams.setOfferToken(offerToken);
            }

            BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(productDetailsParams.build()))
                .build();

            BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), flowParams);
            if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                rejectPending("PURCHASE_LAUNCH_FAILED", launchResult.getDebugMessage());
            }
        }, this::rejectPending);
    }

    private void queryProductDetails(String productId, String kind, ProductDetailsCallback onSuccess, ErrorCallback onError) {
        String cacheKey = kind + ":" + productId;
        if (cachedProductDetails.containsKey(cacheKey)) {
            onSuccess.onProductDetails(cachedProductDetails.get(cacheKey));
            return;
        }

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(getProductType(kind))
            .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, queryResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                onError.onError("PRODUCT_QUERY_FAILED", billingResult.getDebugMessage());
                return;
            }

            List<ProductDetails> productDetailsList = getProductDetailsList(queryResult);
            if (productDetailsList.isEmpty()) {
                onError.onError("PRODUCT_NOT_FOUND", productId);
                return;
            }

            ProductDetails productDetails = productDetailsList.get(0);
            cachedProductDetails.put(cacheKey, productDetails);
            onSuccess.onProductDetails(productDetails);
        });
    }

    private List<ProductDetails> getProductDetailsList(QueryProductDetailsResult queryResult) {
        if (queryResult == null || queryResult.getProductDetailsList() == null) {
            return Collections.emptyList();
        }
        return queryResult.getProductDetailsList();
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) return;

        int responseCode = billingResult.getResponseCode();
        if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            rejectPending("USER_CANCELED", billingResult.getDebugMessage());
            return;
        }

        if (responseCode != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
            rejectPending("PURCHASE_FAILED", billingResult.getDebugMessage());
            return;
        }

        Purchase purchase = findMatchingPurchase(purchases, pendingProductId);
        if (purchase == null) {
            rejectPending("PURCHASE_EMPTY", "Google Play returned no matching purchase");
            return;
        }
        JSObject result = purchaseToJson(purchase, pendingProductCode, pendingProductId);
        pendingPurchaseCall.resolve(result);
        clearPending();
    }

    private JSObject purchaseToJson(Purchase purchase, String productCode, String productId) {
        String resolvedProductId = productId;
        if ((resolvedProductId == null || resolvedProductId.length() == 0) && purchase.getProducts() != null && !purchase.getProducts().isEmpty()) {
            resolvedProductId = purchase.getProducts().get(0);
        }

        JSObject result = new JSObject();
        result.put("ok", purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED);
        result.put("productCode", productCode);
        result.put("productId", resolvedProductId);
        result.put("purchaseToken", purchase.getPurchaseToken());
        result.put("orderId", purchase.getOrderId());
        result.put("purchaseState", purchase.getPurchaseState() == Purchase.PurchaseState.PENDING ? "pending" : "purchased");
        result.put("packageName", purchase.getPackageName() != null ? purchase.getPackageName() : getContext().getPackageName());
        result.put("signature", purchase.getSignature());
        result.put("rawPayload", purchase.getOriginalJson());
        result.put("acknowledged", purchase.isAcknowledged());
        result.put("consumed", false);
        result.put("needsServerReconciliation", true);
        JSArray products = new JSArray();
        for (String product : purchase.getProducts()) {
            products.put(product);
        }
        result.put("products", products);
        return result;
    }

    private Purchase findMatchingPurchase(List<Purchase> purchases, String productId) {
        if (purchases == null || purchases.isEmpty()) {
            return null;
        }

        if (productId == null || productId.length() == 0) {
            return purchases.get(0);
        }

        for (Purchase purchase : purchases) {
            List<String> products = purchase.getProducts();
            if (products != null && products.contains(productId)) {
                return purchase;
            }
        }

        return null;
    }

    private void rejectPending(String code, String message) {
        if (pendingPurchaseCall != null) {
            pendingPurchaseCall.reject(code, message);
        }
        clearPending();
    }

    private void clearPending() {
        pendingPurchaseCall = null;
        pendingProductCode = null;
        pendingProductId = null;
        pendingKind = null;
    }

    private String getProductType(String kind) {
        if ("subscription".equals(kind)) {
            return BillingClient.ProductType.SUBS;
        }
        return BillingClient.ProductType.INAPP;
    }

    private String getFormattedPrice(ProductDetails productDetails) {
        if (productDetails.getOneTimePurchaseOfferDetails() != null) {
            return productDetails.getOneTimePurchaseOfferDetails().getFormattedPrice();
        }
        if (productDetails.getSubscriptionOfferDetails() == null || productDetails.getSubscriptionOfferDetails().isEmpty()) {
            return null;
        }
        ProductDetails.PricingPhase pricingPhase = productDetails
            .getSubscriptionOfferDetails()
            .get(0)
            .getPricingPhases()
            .getPricingPhaseList()
            .get(0);
        return pricingPhase.getFormattedPrice();
    }

    private String getSubscriptionOfferToken(ProductDetails productDetails) {
        if (productDetails.getSubscriptionOfferDetails() == null || productDetails.getSubscriptionOfferDetails().isEmpty()) {
            return null;
        }
        return productDetails.getSubscriptionOfferDetails().get(0).getOfferToken();
    }

    private interface ProductDetailsCallback {
        void onProductDetails(ProductDetails productDetails);
    }

    private interface ErrorCallback {
        void onError(String code, String message);
    }
}
