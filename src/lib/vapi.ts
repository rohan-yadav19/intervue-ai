import Vapi from "@vapi-ai/web";

let vapiInstance: Vapi | null = null;

/**
 * Returns a singleton Vapi client instance.
 * The public key is read from the NEXT_PUBLIC_VAPI_PUBLIC_KEY env var.
 *
 * Must only be called on the client side.
 */
export function getVapiClient(): Vapi {
  if (vapiInstance) {
    return vapiInstance;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error(
      "NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set. Add it to .env.local.",
    );
  }

  vapiInstance = new Vapi(publicKey);
  return vapiInstance;
}
