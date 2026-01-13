export const WHATSAPP_NUMBER = '6285366503363'
export const WHATSAPP_DEFAULT_MESSAGE = 'Halo, saya ingin bertanya tentang Samesta.'

export const getWhatsAppLink = (message = '') => {
  const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${WHATSAPP_NUMBER}${encodedMessage}`
}
