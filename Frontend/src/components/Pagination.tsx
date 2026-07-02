import React from "react";

export default function Pagination({ page, totalPages, onChange }:{ page:number; totalPages:number; onChange:(p:number)=>void }){
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center gap-2">
      <button className="btn" onClick={()=>onChange(Math.max(1, page-1))} aria-label="Previous page">Prev</button>
      <span className="px-2">{page} / {totalPages}</span>
      <button className="btn" onClick={()=>onChange(Math.min(totalPages, page+1))} aria-label="Next page">Next</button>
    </nav>
  )
}
