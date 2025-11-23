import type { UseFacilitator } from "./use-facilitator.type.js";
import type { RequestToPaymentStrategy } from "./request-to-payment-strategy.type.js";
import type { PriceTagRequirementsBase } from "./price-tag.js";
import type {
  FacilitatorConfig,
  PaymentMiddlewareConfig,
  PaywallConfig,
  Resource,
} from "x402/types";
import { useFacilitator } from "x402/verify";
import { priceTagsToRequirements } from "./price-tag.js";
import { IncomingPayment } from "./incoming-payment.js";

export type { PaymentMiddlewareOpts };
export { PaymentMiddleware };

/**
 * The options to configure the payment middleware.
 * @template TRequest The type of the request object.
 */
type PaymentMiddlewareOpts<TRequest> = {
  /**
   * The strategy to extract the payment information from the request.
   * This is used to determine the resource being requested, the payment
   * payload, and whether the paywall can be rendered.
   */
  strategy: RequestToPaymentStrategy<TRequest>;
  /** The facilitator configuration. */
  facilitator?: FacilitatorConfig;
  /** The paywall configuration. */
  paywall?: PaywallConfig;
  /** The payment middleware configuration. */
  config?: PaymentMiddlewareConfig;
  /** The resource being requested. If not provided, it will be extracted from the request. */
  resource?: Resource;
};

/**
 * The payment middleware to handle x402 payments. The middleware is responsible
 * for extracting the payment information from the request, verifying the payment,
 * and providing the payment context.
 *
 * The middleware is generic and can be used with any framework.
 *
 * @example
 * ```ts
 * import { PaymentMiddleware } from "x402-js/server";
 * import { NextRequest } from "next/server";
 *
 * const paymentMiddleware = new PaymentMiddleware<NextRequest>({
 *   strategy: { ... },
 *   facilitator: { ... },
 * });
 *
 * const payment = paymentMiddleware.incoming(request);
 *
 * if (await payment.verified()) {
 *   // ...
 * }
 * ```
 *
 * @template TRequest The type of the request object.
 */
class PaymentMiddleware<TRequest> {
  readonly #facilitator: UseFacilitator;

  readonly #resourceFromRequest: RequestToPaymentStrategy<TRequest>["resource"];
  readonly #paymentFromRequest: RequestToPaymentStrategy<TRequest>["paymentPayload"];
  readonly #canRenderPaywall: RequestToPaymentStrategy<TRequest>["canRenderPaywall"];

  readonly #resource: PaymentMiddlewareOpts<TRequest>["resource"];
  readonly #requirementsBase: PriceTagRequirementsBase;

  constructor(opts: PaymentMiddlewareOpts<TRequest>) {
    this.#facilitator = useFacilitator(opts.facilitator);
    this.#resourceFromRequest = opts.strategy.resource;
    this.#canRenderPaywall = opts.strategy.canRenderPaywall;
    this.#paymentFromRequest = opts.strategy.paymentPayload;
    this.#resource = opts.resource;
    this.#requirementsBase = Object.freeze({
      scheme: "exact",
      description: opts.config?.description || "",
      mimeType: opts.config?.mimeType || "application/json",
      maxTimeoutSeconds: opts.config?.maxTimeoutSeconds || 300,
      outputSchema: opts.config?.outputSchema,
    });
    Object.freeze(this);
  }

  /**
   * The base requirements for the price tag, intended for inspection. This is
   * used to construct the final payment requirements.
   */
  get requirementsBase(): PriceTagRequirementsBase {
    return this.#requirementsBase;
  }

  /**
   * Get the payment context for the incoming request.
   *
   * @param request The request object.
   * @returns The incoming payment context.
   */
  incoming(request: TRequest): IncomingPayment {
    const resource = this.#resource || this.#resourceFromRequest(request);
    const paymentPayload = this.#paymentFromRequest(request);
    const paymentRequirementsFn = priceTagsToRequirements.bind(
      null,
      this.#requirementsBase,
      resource,
    );
    return new IncomingPayment(
      paymentPayload,
      this.#facilitator,
      paymentRequirementsFn,
    );
  }
}
