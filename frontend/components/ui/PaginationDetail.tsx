import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number        // 0-based
  totalPages: number
  totalElements: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) pages.push(i)
    } else {
      pages.push(0)
      if (currentPage > 3) pages.push('...')
      
      const start = Math.max(1, currentPage - 1)
      const end = Math.min(totalPages - 2, currentPage + 1)
      
      for (let i = start; i <= end; i++) pages.push(i)
      
      if (currentPage < totalPages - 4) pages.push('...')
      pages.push(totalPages - 1)
    }
    return pages
  }

  const btnBase = 'w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200'
  const btnActive = 'border-2 border-blue-600 text-blue-600 font-bold' // Hình tròn viền xanh như Agoda
  const btnInactive = 'text-gray-600 hover:bg-gray-100'
  const btnDisabled = 'text-gray-300 cursor-not-allowed'

  return (
    <div className="flex items-center justify-center gap-1 py-2">
      {/* Nút Previous */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className={`${btnBase} ${currentPage === 0 ? btnDisabled : btnInactive}`}
      >
        <ChevronLeft size={20} />
      </button>

      {/* Danh sách số trang */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`${btnBase} ${p === currentPage ? btnActive : btnInactive}`}
            >
              {(p as number) + 1}
            </button>
          )
        )}
      </div>

      {/* Nút Next */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className={`${btnBase} ${currentPage >= totalPages - 1 ? btnDisabled : btnInactive}`}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  )
}