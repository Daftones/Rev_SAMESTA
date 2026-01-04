import whatsappLogo from '../assets/whatsapp logo.png?url'

// Simple floating WhatsApp action that stays visible across screens
function WhatsAppButton({ logoUrl = whatsappLogo }) {
  return (
    <a
      className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-3 rounded-full bg-green-500 px-4 py-3 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-green-600"
      href="https://wa.me/6289506516117"
      target="_blank"
      rel="noreferrer"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white" aria-hidden="true">
        {logoUrl ? (
          <img src={logoUrl} alt="WhatsApp" className="h-8 w-8" />
        ) : (
          <span className="text-xl">💬</span>
        )}
      </div>
      <span className="text-sm font-semibold">Chat Kami</span>
    </a>
  )
}

export default WhatsAppButton
