import React from "react";

export default function ConfirmDialog({ open, title, message, onCancel, onConfirm }:
  { open:boolean; title?:string; message?:string; onCancel:()=>void; onConfirm:()=>void }){
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white p-6 rounded shadow max-w-md w-full">
        <h3 className="font-bold">{title || 'Confirm'}</h3>
        <p className="mt-2 text-sm">{message || 'Are you sure?'}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Yes, delete</button>
        </div>
      </div>
    </div>
  )
}
