import { useState, useCallback, useMemo } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
}

export interface UsePaginationResult {
  pagination: PaginationState;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  getRange: () => { from: number; to: number };
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const { initialPage = 1, initialPageSize = 50 } = options;

  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPage,
    pageSize: initialPageSize,
    totalCount: 0,
  });

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize));
  }, [pagination.totalCount, pagination.pageSize]);

  const hasNextPage = pagination.page < totalPages;
  const hasPrevPage = pagination.page > 1;

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, Math.ceil(prev.totalCount / prev.pageSize) || 1)),
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize,
      page: 1, // Reset to first page when changing page size
    }));
  }, []);

  const setTotalCount = useCallback((totalCount: number) => {
    setPagination((prev) => ({
      ...prev,
      totalCount,
    }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: Math.min(prev.page + 1, Math.ceil(prev.totalCount / prev.pageSize) || 1),
    }));
  }, []);

  const prevPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, prev.page - 1),
    }));
  }, []);

  const getRange = useCallback(() => {
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;
    return { from, to };
  }, [pagination.page, pagination.pageSize]);

  return {
    pagination,
    totalPages,
    setPage,
    setPageSize,
    setTotalCount,
    nextPage,
    prevPage,
    getRange,
    hasNextPage,
    hasPrevPage,
  };
}
