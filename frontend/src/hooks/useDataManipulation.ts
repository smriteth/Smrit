import { useState, useCallback } from 'react'

export function usePagination(items: any[], itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = items.slice(startIndex, endIndex)

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }, [totalPages])

  return {
    currentPage,
    totalPages,
    currentItems,
    goToPage,
  }
}

export function useSearch<T extends Record<string, any>>(items: T[], searchFields: (keyof T)[]) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredItems = items.filter((item) =>
    searchFields.some((field) =>
      String(item[field]).toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  )

  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
  }
}

export function useFilter<T extends Record<string, any>>(
  items: T[],
  filterField: keyof T,
) {
  const [filterValue, setFilterValue] = useState<any>('ALL')

  const filteredItems =
    filterValue === 'ALL' ? items : items.filter((item) => item[filterField] === filterValue)

  return {
    filterValue,
    setFilterValue,
    filteredItems,
  }
}

export function useSort<T extends Record<string, any>>(items: T[], initialField?: keyof T) {
  const [sortField, setSortField] = useState<keyof T | null>(initialField || null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const sortedItems = [...items].sort((a, b) => {
    if (!sortField) return 0

    const aValue = a[sortField]
    const bValue = b[sortField]

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const toggleSort = (field: keyof T) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  return {
    sortField,
    sortOrder,
    sortedItems,
    toggleSort,
  }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return initialValue
    }
  })

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('Error writing to localStorage:', error)
    }
  }

  return [storedValue, setValue] as const
}
