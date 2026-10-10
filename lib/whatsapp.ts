/**
 * SENO WhatsApp Business Support Configuration and URL Builder
 * Official Business Number: +91 8617648031
 * Official Destination: https://wa.me/918617648031
 */

export const SENO_WHATSAPP_NUMBER = '+91 8617648031'
export const SENO_WHATSAPP_PHONE_DIGITS = '918617648031'
export const SENO_WHATSAPP_BASE_URL = 'https://wa.me/918617648031'

export type WhatsAppSupportType = 'general' | 'return_refund' | 'order' | 'direct'

export interface WhatsAppUrlOptions {
  type?: WhatsAppSupportType
  orderNumber?: string
  customMessage?: string
}

/**
 * Builds standard WhatsApp click-to-chat URL with contextual URL-encoded messages.
 * Never includes private customer details, credentials, or authentication tokens.
 */
export function getWhatsAppSupportUrl(options?: WhatsAppUrlOptions): string {
  if (!options || options.type === 'direct') {
    return SENO_WHATSAPP_BASE_URL
  }

  if (options.customMessage) {
    return `${SENO_WHATSAPP_BASE_URL}?text=${encodeURIComponent(options.customMessage)}`
  }

  switch (options.type) {
    case 'return_refund':
      return `${SENO_WHATSAPP_BASE_URL}?text=${encodeURIComponent('Hello SENO, I need help with a return or refund.')}`
    case 'order': {
      const sanitizedOrder = (options.orderNumber || '').trim().replace(/[^\w-]/g, '')
      const message = sanitizedOrder
        ? `Hello SENO, I need help with order #${sanitizedOrder} regarding a product issue.`
        : 'Hello SENO, I need help with an order regarding a product issue.'
      return `${SENO_WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`
    }
    case 'general':
    default:
      return `${SENO_WHATSAPP_BASE_URL}?text=${encodeURIComponent('Hello SENO, I need help with an order.')}`
  }
}
