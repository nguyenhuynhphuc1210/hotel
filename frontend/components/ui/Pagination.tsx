import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number        // 0-based (theo Spring Boot)
  totalPages: number
  totalElements: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export default function Pagination({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  if (totalPages <= 1 && totalElements <= pageSizeOptions[0]) return null

  const from = totalElements === 0 ? 0 : currentPage * pageSize + 1
  const to = Math.min((currentPage + 1) * pageSize, totalElements)

  // Tạo danh sách số trang hiển thị (tối đa 5 nút)
  const getPageNumbers = () => {
    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i)
    }
    pages.push(0)
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 4) pages.push('...')
    pages.push(totalPages - 1)
    return pages
  }

  const btnBase = 'h-8 min-w-[32px] px-1.5 flex items-center justify-center rounded-lg text-sm font-medium transition-all'
  const btnActive = 'bg-blue-600 text-white shadow-sm'
  const btnInactive = 'text-gray-600 hover:bg-gray-100'
  const btnDisabled = 'text-gray-300 cursor-not-allowed'

  return (
    <div className="flex items-center justify-between gap-4 pt-1">
      {/* Hiển thị số bản ghi */}
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-500 whitespace-nowrap">
          {totalElements === 0 ? '0 kết quả' : `${from}–${to} / ${totalElements}`}
        </p>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(0) }}
            className="px-2 py-1 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pageSizeOptions.map(s => (
              <option key={s} value={s}>{s} / trang</option>
            ))}
          </select>
        )}
      </div>

      {/* Nút điều hướng */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          className={`${btnBase} ${currentPage === 0 ? btnDisabled : btnInactive}`}
        >
          <ChevronsLeft size={15} />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className={`${btnBase} ${currentPage === 0 ? btnDisabled : btnInactive}`}
        >
          <ChevronLeft size={15} />
        </button>

        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="h-8 w-8 flex items-center justify-center text-gray-400 text-sm">…</span>
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

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className={`${btnBase} ${currentPage >= totalPages - 1 ? btnDisabled : btnInactive}`}
        >
          <ChevronRight size={15} />
        </button>
        <button
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage >= totalPages - 1}
          className={`${btnBase} ${currentPage >= totalPages - 1 ? btnDisabled : btnInactive}`}
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  )
}