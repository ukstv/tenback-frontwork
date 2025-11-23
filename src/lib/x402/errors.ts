import type { PaymentRequirements } from "x402/types";

export { X402Error, X402ConfigurationError };

/**
 * Represents an error that occurs during X402 payment processing.
 * This error includes details about acceptable payment requirements and optional payer information.
 */
class X402Error extends Error {
  readonly name: "X402Error";
  readonly x402Version = 1;
  readonly error: Error | string;
  readonly accepts: Array<PaymentRequirements>;
  readonly payer?: string;

  constructor(
    error: Error | string,
    accepts: Array<PaymentRequirements>,
    payer?: string,
  ) {
    let message: string;
    let props: { cause: Error } | undefined = undefined;
    if (typeof error === "string") {
      message = error;
    } else {
      message = error.message;
      props = { cause: error };
    }
    super(message, props);
    this.name = "X402Error";
    this.error = error;
    this.accepts = accepts;
    this.payer = payer;
  }

  toJSON() {
    return {
      x402Version: this.x402Version,
      error: this.error,
      accepts: this.accepts,
      payer: this.payer,
    };
  }
}

/**
 * Represents an error that occurs due to incorrect parameters being passed,
 * for example, when a price provided cannot be converted to an atomic amount.
 */
class X402ConfigurationError extends Error {
  readonly name: "X402ConfigurationError";

  /**
   * @param message - The error message.
   */
  constructor(message: string) {
    super(`X402 Configuration Error: ${message}`);
    this.name = "X402ConfigurationError";
  }
}
