import whatsappLogo from '../assets/whatsapp logo.png?url'
import { getWhatsAppLink, WHATSAPP_DEFAULT_MESSAGE } from '../constants/whatsapp'

// Simple floating WhatsApp action that stays visible across screens
function WhatsAppButton({ logoUrl = whatsappLogo }) {
  const whatsappHref = getWhatsAppLink(WHATSAPP_DEFAULT_MESSAGE)

  return (
    <a
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full bg-green-500 px-3 py-2 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-green-600 sm:bottom-6 sm:right-6 sm:gap-3 sm:px-4 sm:py-3"
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white sm:h-10 sm:w-10" aria-hidden="true">
        {logoUrl ? (
          <img src={logoUrl} alt="WhatsApp" className="h-6 w-6 sm:h-8 sm:w-8" />
        ) : (
          <span className="text-xl">💬</span>
        )}
      </div>
    </a>
  )
}

export default WhatsAppButton
