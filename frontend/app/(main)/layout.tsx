import Header from '@/components/common/Header'
import Footer from '@/components/common/Footer'
import AIChatWidget from '@/components/chat/AIChatWidget'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>{children}</main>      
      <Footer />  
      <AIChatWidget />    
    </div>
  )
}