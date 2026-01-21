import { Carousel } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import studioImg from '../assets/Studio room 1.jpeg'
import twoBedImg from '../assets/2 bedroom 1.jpeg'

const slides = [
  {
    title: 'Studio Room',
    description: 'Cocok untuk beristirahat dan bekerja',
    image: studioImg,
  },
  {
    title: '2 Bedroom',
    description: 'Cocok untuk keluarga kecil anda',
    image: twoBedImg,
  },
]

export default function HeroCarousel() {
  return (
    <Carousel fade interval={5000} pause="hover" className="overflow-hidden">
      {slides.map((slide, idx) => (
        <Carousel.Item key={idx}>
          <div
            className="relative w-full min-h-[60vh] md:min-h-[72vh] flex items-center bg-slate-900"
            style={{
              backgroundImage: `linear-gradient(135deg, rgba(9,9,11,0.85), rgba(15,23,42,0.6)), url(${slide.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.2),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.15),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.15),transparent_40%)]" />
            <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
              <div className="max-w-2xl space-y-4 text-center md:text-left text-white">
                <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">{slide.title}</h1>
                <p className="text-lg md:text-xl text-slate-100/90">{slide.description}</p>
                <Link
                  to="/apartments"
                  className="inline-flex items-center justify-center gap-2 mt-4 rounded-full bg-white/15 px-6 py-3 text-lg font-semibold text-white backdrop-blur transition hover:scale-105 hover:bg-white/25 w-full sm:w-auto"
                >
                  Booking sekarang
                </Link>
              </div>
            </div>
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  )
}
