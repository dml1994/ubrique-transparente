"use client";

import { useRouter } from "next/navigation";

type Props = {
  id: number;
  children: React.ReactNode;
};

export function ContractRow({ id, children }: Props) {
  const router = useRouter();
  return (
    <tr
      className="hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => router.push(`/contratos/${id}`)}
    >
      {children}
    </tr>
  );
}
