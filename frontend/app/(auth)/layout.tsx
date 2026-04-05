import Header from '@/components/common/Header'
import Footer from '@/components/common/Footer'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white"> 
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 px-4">
        {children}
      </main>
      <Footer />
    </div>
  )
}