import type { PaymentPayload, Resource } from "x402/types";

export type { RequestToPaymentStrategy };

/**
 * Interface for strategies that convert a request to payment-related information.
 * Defines methods to extract the resource identifier, determine if a paywall can be rendered,
 * and retrieve the payment payload from the request.
 * @template TRequest The type of the request object.
 */
interface RequestToPaymentStrategy<TRequest> {
  /**
   * Extract the resource URL from the given request.
   * @param request The request object.
   * @returns The resource identifier.
   */
  resource(request: TRequest): Resource;

  /**
   * Determine whether a paywall can be rendered for the given request,
   * usually based on request headers to determine if the requestor is human.
   * @param request The request object.
   * @returns True if the paywall can be rendered, false otherwise.
   */
  canRenderPaywall(request: TRequest): boolean;

  /**
   * Retrieve the payment payload from the request `X-Payment` header, if available.
   * @param request The request object.
   * @returns The payment payload or undefined if not present.
   */
  paymentPayload(request: TRequest): PaymentPayload | undefined;
}
