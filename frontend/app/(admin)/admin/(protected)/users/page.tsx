'use client'

import { useState, useEffect } from 'react'
import { useUsers, useDeleteUser, useDisableUser, useEnableUser } from '@/hooks/useUser'
import { UserResponse } from '@/types/user.types'
import {
  Search,
  Trash2,
  ShieldOff,
  ShieldCheck,
  Pencil,
  Crown,
  Store,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Loader2,
  RotateCcw
} from 'lucide-react'

import UserCreateModal from '@/components/admin/user/UserCreateModal'
import UserEditModal from '@/components/admin/user/UserEditModal'
import Pagination from '@/components/ui/Pagination'

const ROLE_MAP = {
  ROLE_ADMIN: {
    label: 'Admin',
    class: 'bg-purple-50 text-purple-700',
    icon: Crown,
  },
  ROLE_HOTEL_OWNER: {
    label: 'Chủ KS',
    class: 'bg-blue-50 text-blue-700',
    icon: Store,
  },
  ROLE_USER: {
    label: 'Khách hàng',
    class: 'bg-gray-100 text-gray-600',
    icon: UserIcon,
  },
}

const GENDER_MAP = {
  MALE: 'Nam',
  FEMALE: 'Nữ',
  OTHER: 'Khác',
}

export default function AdminUsersPage() {
  
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  
  const [search, setSearch] = useState('')
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  
  const [openCreate, setOpenCreate] = useState(false)
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null)

  
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(search)
    }, 500)

    return () => clearTimeout(timer)
  }, [search])

  
  const { data: pageData, isLoading } = useUsers(
  currentPage,
  pageSize,
  keyword,
  roleFilter
)

const users: UserResponse[] = pageData?.content || []

const { data: allData } = useUsers(0, 9999, '', '')
const allUsers = allData?.content || []

  
  const finalUsers = users.filter(u => {
    if (statusFilter === 'active') return u.isActive
    if (statusFilter === 'inactive') return !u.isActive
    return true
  })

  
  const deleteMutation = useDeleteUser()
  const disableMutation = useDisableUser()
  const enableMutation = useEnableUser()

 
  const totalAdmin  = allUsers.filter(u => u.roleName === 'ROLE_ADMIN').length
const totalOwner  = allUsers.filter(u => u.roleName === 'ROLE_HOTEL_OWNER').length
const totalUser   = allUsers.filter(u => u.roleName === 'ROLE_USER').length
const totalLocked = allUsers.filter(u => !u.isActive).length

  const handleDelete = (u: UserResponse) => {
    if (confirm(`Xoá tài khoản "${u.fullName}"?`)) {
      deleteMutation.mutate(u.id)
    }
  }

  const handleToggleActive = (u: UserResponse) => {
    if (u.isActive) {
      if (confirm(`Khoá tài khoản "${u.fullName}"?`)) {
        disableMutation.mutate(u.id)
      }
    } else {
      if (confirm(`Mở khoá tài khoản "${u.fullName}"?`)) {
        enableMutation.mutate(u.id)
      }
    }
  }

  const handleClearFilter = () => {
    setSearch('')
    setKeyword('')
    setRoleFilter('')
    setStatusFilter('')
    setActiveStatFilter('')
    setCurrentPage(0)
  }

  const [activeStatFilter, setActiveStatFilter] = useState<string>('')

  const handleStatClick = (filterType: string) => {
  if (activeStatFilter === filterType) {
    
    setActiveStatFilter('')
    setRoleFilter('')
    setStatusFilter('')
  } else {
    setActiveStatFilter(filterType)
    if (filterType === 'locked') {
      setRoleFilter('')
      setStatusFilter('inactive')
    } else {
      setRoleFilter(filterType)
      setStatusFilter('')
    }
    setCurrentPage(0)
  }
}

  return (
    <div className="space-y-5">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý người dùng
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Tổng cộng: {pageData?.totalElements || 0} tài khoản
          </p>
        </div>
      </div>

      
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  {[
    {
      key: 'ROLE_ADMIN',
      label: 'Admin',
      value: totalAdmin,
      icon: Crown,
      activeClass: 'border-purple-500 bg-purple-50',
      inactiveClass: 'border-gray-200 bg-white hover:border-gray-300',
      iconClass: 'text-purple-500',
      valueColor: 'text-purple-600 bg-purple-50',
    },
    {
      key: 'ROLE_HOTEL_OWNER',
      label: 'Chủ KS',
      value: totalOwner,
      icon: Store,
      activeClass: 'border-blue-500 bg-blue-50',
      inactiveClass: 'border-gray-200 bg-white hover:border-gray-300',
      iconClass: 'text-blue-500',
      valueColor: 'text-blue-600 bg-blue-50',
    },
    {
      key: 'ROLE_USER',
      label: 'Khách hàng',
      value: totalUser,
      icon: UserIcon,
      activeClass: 'border-gray-500 bg-gray-50',
      inactiveClass: 'border-gray-200 bg-white hover:border-gray-300',
      iconClass: 'text-gray-500',
      valueColor: 'text-gray-600 bg-gray-100',
    },
    {
      key: 'locked',
      label: 'Bị khoá',
      value: totalLocked,
      icon: XCircle,
      activeClass: 'border-red-500 bg-red-50',
      inactiveClass: 'border-gray-200 bg-white hover:border-gray-300',
      iconClass: 'text-red-400',
      valueColor: 'text-red-600 bg-red-50',
    },
  ].map(s => {
    const Icon = s.icon
    const isActive = activeStatFilter === s.key
    return (
      <button
        key={s.key}
        onClick={() => handleStatClick(s.key)}
        className={`rounded-xl border-2 px-4 py-3 flex items-center justify-between transition-all text-left ${
          isActive ? s.activeClass : s.inactiveClass
        }`}
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className={isActive ? s.iconClass : 'text-gray-400'} />
          <span className="text-sm text-gray-500">{s.label}</span>
        </div>
        <span className={`text-lg font-bold px-2.5 py-0.5 rounded-lg ${s.valueColor}`}>
          {s.value}
        </span>
      </button>
    )
  })}
</div>

      
      <div className="flex gap-3 flex-wrap">
        
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            placeholder="Tìm tên, email, số điện thoại..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setCurrentPage(0)
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        
        <select
          value={roleFilter}
          onChange={e => {
            setRoleFilter(e.target.value)
            setCurrentPage(0)
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tất cả role</option>
          <option value="ROLE_ADMIN">Admin</option>
          <option value="ROLE_HOTEL_OWNER">Chủ khách sạn</option>
          <option value="ROLE_USER">Khách hàng</option>
        </select>

        
        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value)
            setCurrentPage(0)
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Bị khoá</option>
        </select>

        
        <button
          onClick={handleClearFilter}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          <RotateCcw size={15} />
          Xóa bộ lọc
        </button>
      </div>

      
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Người dùng</th>
              <th className="text-left px-4 py-3">Liên hệ</th>
              <th className="text-left px-4 py-3">Giới tính</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-left px-4 py-3">Ngày tạo</th>
              <th className="text-right px-4 py-3">Hành động</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />

                  <p className="mt-2 text-gray-400">
                    Đang tải dữ liệu...
                  </p>
                </td>
              </tr>
            ) : finalUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-12 text-gray-400"
                >
                  Không tìm thấy người dùng nào
                </td>
              </tr>
            ) : (
              finalUsers.map(u => {
                const roleKey =
                  u.roleName as keyof typeof ROLE_MAP

                const role =
                  ROLE_MAP[roleKey] || ROLE_MAP.ROLE_USER

                const RoleIcon = role.icon

                const genderLabel = u.gender
                  ? GENDER_MAP[
                  u.gender as keyof typeof GENDER_MAP
                  ]
                  : '—'

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-gray-50 transition-colors ${!u.isActive ? 'opacity-60' : ''
                      }`}
                  >
                    
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div className="font-medium text-gray-900">
                            {u.fullName}
                          </div>

                          <div className="text-xs text-gray-400">
                            #{u.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    
                    <td className="px-4 py-3 text-gray-700">
                      <div>{u.email}</div>

                      <div className="text-xs text-gray-400">
                        {u.phone ?? '—'}
                      </div>
                    </td>

                    
                    <td className="px-4 py-3 text-gray-600">
                      {genderLabel}
                    </td>

                    
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${role.class}`}
                      >
                        <RoleIcon size={11} />
                        {role.label}
                      </span>
                    </td>

                    
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                          <CheckCircle size={11} />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
                          <XCircle size={11} />
                          Bị khoá
                        </span>
                      )}
                    </td>

                    
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString(
                        'vi-VN'
                      )}
                    </td>

                    
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={
                            disableMutation.isPending ||
                            enableMutation.isPending
                          }
                          className={`p-1.5 rounded-lg transition-colors ${u.isActive
                            ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                            }`}
                        >
                          {u.isActive ? (
                            <ShieldOff size={15} />
                          ) : (
                            <ShieldCheck size={15} />
                          )}
                        </button>

                        
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        
        {pageData && pageData.totalPages > 1 && (
          <div className="px-4 py-4 border-t border-gray-100">
            <Pagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalPages={pageData.totalPages}
              totalElements={pageData.totalElements}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      
      <UserCreateModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
      />

      <UserEditModal
        user={editingUser}
        onClose={() => setEditingUser(null)}
      />
    </div>
  )
}