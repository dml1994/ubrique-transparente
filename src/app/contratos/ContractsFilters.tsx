"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { Route } from "next";

type Props = {
  types: Array<{ code: string; label: string }>;
};

export default function ContractsFilters({ types }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}` as Route));
    },
    [router, pathname, searchParams]
  );

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center transition-opacity ${isPending ? "opacity-60" : ""}`}
    >
      {/* Buscador */}
      <div className="flex-1 min-w-56">
        <input
          type="search"
          placeholder="Buscar por título, empresa, CPV…"
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => updateParam("q", e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Tipo */}
      <select
        value={searchParams.get("type") ?? ""}
        onChange={(e) => updateParam("type", e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">Todos los tipos</option>
        {types.map((t) => (
          <option key={t.code} value={t.code}>
            {t.label}
          </option>
        ))}
      </select>

      {/* Estado */}
      <select
        value={searchParams.get("status") ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">Todos los estados</option>
        <option value="awarded">Adjudicado</option>
        <option value="published">Publicado</option>
        <option value="in_progress">En tramitación</option>
        <option value="cancelled">Cancelado</option>
      </select>

      {/* Ordenación */}
      <select
        value={`${searchParams.get("sort") ?? "publishedDate"}:${searchParams.get("order") ?? "desc"}`}
        onChange={(e) => {
          const [sort, order] = e.target.value.split(":");
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", sort);
          params.set("order", order);
          params.delete("page");
          startTransition(() => router.push(`${pathname}?${params.toString()}` as Route));
        }}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="publishedDate:desc">Más recientes primero</option>
        <option value="publishedDate:asc">Más antiguos primero</option>
        <option value="amount:desc">Mayor importe primero</option>
        <option value="amount:asc">Menor importe primero</option>
      </select>

      {/* Limpiar */}
      {(searchParams.get("q") || searchParams.get("year") || searchParams.get("type") || searchParams.get("status")) && (
        <button
          onClick={() => startTransition(() => router.push(pathname as Route))}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900 underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
